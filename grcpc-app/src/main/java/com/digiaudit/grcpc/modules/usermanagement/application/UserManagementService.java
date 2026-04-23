package com.digiaudit.grcpc.modules.usermanagement.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.AssignRoleRequest;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.CreateUserRequest;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.request.UpdateUserRequest;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.AppUserEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.RoleEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.UserRoleAssignmentEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.AppUserRepository;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.RoleRepository;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.UserRoleAssignmentRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserManagementService {

    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;
    private final UserRoleAssignmentRepository userRoleAssignmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserProvider currentUserProvider;
    private final AuditService auditService;

    @Transactional
    public UUID createUser(CreateUserRequest request, HttpServletRequest httpServletRequest) {
        currentUserProvider.assertCurrentUserIsRoot();

        String normalizedUsername = request.username().trim().toLowerCase(Locale.ROOT);
        if (appUserRepository.existsByUsername(normalizedUsername)) {
            throw new ConflictException("Username already exists");
        }

        UUID actorUserId = currentUserProvider.getCurrentUserIdOrNull();
        log.info("Creating new user. actorUserId={}, username={}", actorUserId, normalizedUsername);

        AppUserEntity user = appUserRepository.save(
                AppUserEntity.builder()
                        .username(normalizedUsername)
                        .passwordHash(passwordEncoder.encode(request.password()))
                        .firstName(request.firstName().trim())
                        .lastName(request.lastName().trim())
                        .mobile(blankToNull(request.mobile()))
                        .email(blankToNull(request.email()))
                        .enabled(request.enabled() == null || request.enabled())
                        .locked(false)
                        .rootUser(false)
                        .defaultOrgUnitId(request.defaultOrgUnitId())
                        .createdBy(actorUserId)
                        .updatedBy(actorUserId)
                        .build()
        );

        auditService.log(
                AuditEventType.USER_CREATED,
                AuditTargetType.USER,
                user.getId().toString(),
                ActionResult.SUCCESS,
                actorUserId,
                httpServletRequest,
                Map.of("username", user.getUsername())
        );

        return user.getId();
    }

    @Transactional
    public void updateUser(UUID userId, UpdateUserRequest request, HttpServletRequest httpServletRequest) {
        currentUserProvider.assertCurrentUserIsRoot();
        AppUserEntity user = appUserRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User was not found"));

        UUID actorUserId = currentUserProvider.getCurrentUserIdOrNull();
        log.info("Updating user. actorUserId={}, userId={}", actorUserId, userId);

        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setMobile(blankToNull(request.mobile()));
        user.setEmail(blankToNull(request.email()));
        user.setDefaultOrgUnitId(request.defaultOrgUnitId());
        if (request.enabled() != null) {
            user.setEnabled(request.enabled());
        }
        if (request.locked() != null) {
            user.setLocked(request.locked());
        }
        user.setUpdatedBy(actorUserId);
        appUserRepository.save(user);

        auditService.log(
                AuditEventType.USER_UPDATED,
                AuditTargetType.USER,
                user.getId().toString(),
                ActionResult.SUCCESS,
                actorUserId,
                httpServletRequest,
                Map.of("username", user.getUsername(), "enabled", user.isEnabled(), "locked", user.isLocked())
        );
    }

    @Transactional
    public void enableUser(UUID userId, HttpServletRequest httpServletRequest) {
        updateEnabledFlag(userId, true, httpServletRequest);
    }

    @Transactional
    public void disableUser(UUID userId, HttpServletRequest httpServletRequest) {
        updateEnabledFlag(userId, false, httpServletRequest);
    }

    @Transactional
    public void assignRole(UUID userId, AssignRoleRequest request, HttpServletRequest httpServletRequest) {
        currentUserProvider.assertCurrentUserIsRoot();

        AppUserEntity user = appUserRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User was not found"));

        RoleEntity role = roleRepository.findById(request.roleId())
                .orElseThrow(() -> new NotFoundException("Role was not found"));

        validateScope(request.scopeType(), request.scopeOrgUnitId());

        boolean exists = userRoleAssignmentRepository.existsByUser_IdAndRole_IdAndScopeTypeAndScopeOrgUnitIdAndActiveTrue(
                user.getId(),
                role.getId(),
                request.scopeType(),
                request.scopeOrgUnitId()
        );

        if (exists) {
            throw new ConflictException("Role assignment already exists");
        }

        UUID actorUserId = currentUserProvider.getCurrentUserIdOrNull();
        log.info("Assigning role to user. actorUserId={}, userId={}, roleId={}, scopeType={}", actorUserId, userId, role.getId(), request.scopeType());

        UserRoleAssignmentEntity entity = UserRoleAssignmentEntity.builder()
                .user(user)
                .role(role)
                .scopeType(request.scopeType())
                .scopeOrgUnitId(request.scopeOrgUnitId())
                .validFrom(request.validFrom())
                .validTo(request.validTo())
                .assignedBy(actorUserId)
                .assignedAt(LocalDateTime.now())
                .active(true)
                .build();

        userRoleAssignmentRepository.save(entity);

        auditService.log(
                AuditEventType.USER_ROLE_ASSIGNED,
                AuditTargetType.USER,
                user.getId().toString(),
                ActionResult.SUCCESS,
                actorUserId,
                httpServletRequest,
                Map.of("roleCode", role.getCode(), "scopeType", request.scopeType().name(), "scopeOrgUnitId", request.scopeOrgUnitId())
        );
    }

    private void updateEnabledFlag(UUID userId, boolean enabled, HttpServletRequest httpServletRequest) {
        currentUserProvider.assertCurrentUserIsRoot();
        AppUserEntity user = appUserRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User was not found"));
        UUID actorUserId = currentUserProvider.getCurrentUserIdOrNull();
        user.setEnabled(enabled);
        user.setUpdatedBy(actorUserId);
        appUserRepository.save(user);
        log.info("Changed user enabled flag. actorUserId={}, userId={}, enabled={}", actorUserId, userId, enabled);

        auditService.log(
                AuditEventType.USER_UPDATED,
                AuditTargetType.USER,
                user.getId().toString(),
                ActionResult.SUCCESS,
                actorUserId,
                httpServletRequest,
                Map.of("enabled", enabled, "username", user.getUsername())
        );
    }

    private void validateScope(ScopeType scopeType, UUID scopeOrgUnitId) {
        boolean orgScope = scopeType == ScopeType.ORG_UNIT || scopeType == ScopeType.ORG_SUBTREE;
        if (orgScope && scopeOrgUnitId == null) {
            throw new ConflictException("scopeOrgUnitId is required for ORG_UNIT and ORG_SUBTREE");
        }
        if (!orgScope && scopeOrgUnitId != null) {
            throw new ConflictException("scopeOrgUnitId must be null for GLOBAL and SELF");
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
