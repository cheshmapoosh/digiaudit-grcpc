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

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
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

        if (user.isRootUser() && (Boolean.FALSE.equals(request.enabled()) || Boolean.TRUE.equals(request.locked()) || request.defaultOrgUnitId() != null)) {
            throw new ConflictException("Root user cannot be disabled, locked or organization-restricted");
        }

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
        if (!role.isEnabled()) throw new ConflictException("Disabled role cannot be assigned");
        if (request.validFrom() != null && request.validTo() != null && request.validTo().isBefore(request.validFrom())) {
            throw new ConflictException("validTo must not precede validFrom");
        }

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
        Map<String, Object> auditDetails = new LinkedHashMap<>();
        auditDetails.put("roleCode", role.getCode());
        auditDetails.put("scopeType", request.scopeType().name());
        auditDetails.put("scopeOrgUnitId", request.scopeOrgUnitId());

        auditService.log(
                AuditEventType.USER_ROLE_ASSIGNED,
                AuditTargetType.USER,
                user.getId().toString(),
                ActionResult.SUCCESS,
                actorUserId,
                httpServletRequest,
                auditDetails
        );
    }

    private void updateEnabledFlag(UUID userId, boolean enabled, HttpServletRequest httpServletRequest) {
        currentUserProvider.assertCurrentUserIsRoot();
        AppUserEntity user = appUserRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User was not found"));
        UUID actorUserId = currentUserProvider.getCurrentUserIdOrNull();
        if (user.isRootUser() && !enabled) throw new ConflictException("Root user cannot be disabled");
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
        if (scopeType != ScopeType.GLOBAL || scopeOrgUnitId != null) {
            throw new ConflictException("Only GLOBAL assignments with no organization are supported in this phase");
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
