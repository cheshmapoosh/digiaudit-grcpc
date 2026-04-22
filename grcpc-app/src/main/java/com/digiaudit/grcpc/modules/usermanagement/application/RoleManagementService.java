package com.digiaudit.grcpc.modules.usermanagement.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.CreateRoleRequest;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.LocalizedTextRequest;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.request.UpdateRoleRequest;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.*;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoleManagementService {

    private final RoleRepository roleRepository;
    private final RoleI18nRepository roleI18nRepository;
    private final PermissionRepository permissionRepository;
    private final BusinessPermissionRepository businessPermissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final RoleBusinessPermissionRepository roleBusinessPermissionRepository;
    private final CurrentUserProvider currentUserProvider;
    private final AuditService auditService;

    @Transactional
    public UUID createRole(CreateRoleRequest request, HttpServletRequest httpServletRequest) {
        currentUserProvider.assertCurrentUserIsRoot();

        String normalizedCode = request.code().trim().toUpperCase(Locale.ROOT);
        if (roleRepository.existsByCode(normalizedCode)) {
            throw new ConflictException("Role code already exists");
        }

        validateTranslations(request.translations());

        UUID actorUserId = currentUserProvider.getCurrentUserIdOrNull();
        log.info("Creating role. actorUserId={}, roleCode={}", actorUserId, normalizedCode);

        RoleEntity role = roleRepository.save(
                RoleEntity.builder()
                        .code(normalizedCode)
                        .systemDefined(false)
                        .enabled(request.enabled() == null || request.enabled())
                        .createdBy(actorUserId)
                        .updatedBy(actorUserId)
                        .build()
        );

        roleI18nRepository.saveAll(
                request.translations().stream()
                        .map(item -> RoleI18nEntity.builder()
                                .role(role)
                                .locale(normalizeLocale(item.locale()))
                                .title(item.title().trim())
                                .description(blankToNull(item.description()))
                                .build())
                        .toList()
        );

        auditService.log(
                AuditEventType.ROLE_CREATED,
                AuditTargetType.ROLE,
                role.getId().toString(),
                ActionResult.SUCCESS,
                actorUserId,
                httpServletRequest,
                Map.of(
                        "code", role.getCode(),
                        "locales", request.translations().stream().map(LocalizedTextRequest::locale).map(this::normalizeLocale).toList()
                )
        );

        return role.getId();
    }

    @Transactional
    public void updateRole(UUID roleId, UpdateRoleRequest request, HttpServletRequest httpServletRequest) {
        currentUserProvider.assertCurrentUserIsRoot();
        validateTranslations(request.translations());

        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> new NotFoundException("Role was not found"));

        UUID actorUserId = currentUserProvider.getCurrentUserIdOrNull();
        log.info("Updating role. actorUserId={}, roleId={}, roleCode={}", actorUserId, roleId, role.getCode());

        if (request.enabled() != null) {
            role.setEnabled(request.enabled());
        }
        role.setUpdatedBy(actorUserId);
        roleRepository.save(role);

        roleI18nRepository.deleteAllByRole(role);
        roleI18nRepository.saveAll(
                request.translations().stream()
                        .map(item -> RoleI18nEntity.builder()
                                .role(role)
                                .locale(normalizeLocale(item.locale()))
                                .title(item.title().trim())
                                .description(blankToNull(item.description()))
                                .build())
                        .toList()
        );

        auditService.log(
                AuditEventType.ROLE_UPDATED,
                AuditTargetType.ROLE,
                role.getId().toString(),
                ActionResult.SUCCESS,
                actorUserId,
                httpServletRequest,
                Map.of("code", role.getCode(), "enabled", role.isEnabled())
        );
    }

    @Transactional
    public void enableRole(UUID roleId, HttpServletRequest httpServletRequest) {
        updateRoleEnabled(roleId, true, httpServletRequest);
    }

    @Transactional
    public void disableRole(UUID roleId, HttpServletRequest httpServletRequest) {
        updateRoleEnabled(roleId, false, httpServletRequest);
    }

    @Transactional
    public void replaceSystemPermissions(UUID roleId, Set<String> permissionCodes, HttpServletRequest httpServletRequest) {
        currentUserProvider.assertCurrentUserIsRoot();

        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> new NotFoundException("Role was not found"));

        Set<String> normalizedCodes = permissionCodes == null
                ? Set.of()
                : permissionCodes.stream().map(String::trim).map(String::toUpperCase).collect(Collectors.toSet());

        List<PermissionEntity> permissions = normalizedCodes.isEmpty()
                ? List.of()
                : permissionRepository.findAllByCodeIn(normalizedCodes);

        if (permissions.size() != normalizedCodes.size()) {
            throw new NotFoundException("One or more system permissions were not found");
        }

        UUID actorUserId = currentUserProvider.getCurrentUserIdOrNull();
        log.info("Replacing system permissions for role. actorUserId={}, roleId={}, permissionCount={}", actorUserId, roleId, permissions.size());
        rolePermissionRepository.deleteAllByRole(role);
        permissions.forEach(permission -> rolePermissionRepository.save(
                RolePermissionEntity.builder()
                        .role(role)
                        .permission(permission)
                        .createdBy(actorUserId)
                        .build()
        ));

        auditService.log(
                AuditEventType.ROLE_PERMISSION_REPLACED,
                AuditTargetType.ROLE,
                role.getId().toString(),
                ActionResult.SUCCESS,
                actorUserId,
                httpServletRequest,
                Map.of("permissionCount", permissions.size(), "roleCode", role.getCode())
        );
    }

    @Transactional
    public void replaceBusinessPermissions(UUID roleId, Set<String> permissionCodes, HttpServletRequest httpServletRequest) {
        currentUserProvider.assertCurrentUserIsRoot();

        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> new NotFoundException("Role was not found"));

        Set<String> normalizedCodes = permissionCodes == null
                ? Set.of()
                : permissionCodes.stream().map(String::trim).map(String::toUpperCase).collect(Collectors.toSet());

        List<BusinessPermissionEntity> permissions = normalizedCodes.isEmpty()
                ? List.of()
                : businessPermissionRepository.findAllByCodeIn(normalizedCodes);

        if (permissions.size() != normalizedCodes.size()) {
            throw new NotFoundException("One or more business permissions were not found");
        }

        UUID actorUserId = currentUserProvider.getCurrentUserIdOrNull();
        log.info("Replacing business permissions for role. actorUserId={}, roleId={}, permissionCount={}", actorUserId, roleId, permissions.size());
        roleBusinessPermissionRepository.deleteAllByRole(role);
        permissions.forEach(permission -> roleBusinessPermissionRepository.save(
                RoleBusinessPermissionEntity.builder()
                        .role(role)
                        .businessPermission(permission)
                        .createdBy(actorUserId)
                        .build()
        ));

        auditService.log(
                AuditEventType.ROLE_BUSINESS_PERMISSION_REPLACED,
                AuditTargetType.ROLE,
                role.getId().toString(),
                ActionResult.SUCCESS,
                actorUserId,
                httpServletRequest,
                Map.of("permissionCount", permissions.size(), "roleCode", role.getCode())
        );
    }

    private void updateRoleEnabled(UUID roleId, boolean enabled, HttpServletRequest httpServletRequest) {
        currentUserProvider.assertCurrentUserIsRoot();
        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> new NotFoundException("Role was not found"));
        UUID actorUserId = currentUserProvider.getCurrentUserIdOrNull();
        role.setEnabled(enabled);
        role.setUpdatedBy(actorUserId);
        roleRepository.save(role);
        log.info("Changed role enabled flag. actorUserId={}, roleId={}, enabled={}", actorUserId, roleId, enabled);
        auditService.log(
                AuditEventType.ROLE_UPDATED,
                AuditTargetType.ROLE,
                role.getId().toString(),
                ActionResult.SUCCESS,
                actorUserId,
                httpServletRequest,
                Map.of("enabled", enabled, "roleCode", role.getCode())
        );
    }

    private void validateTranslations(List<LocalizedTextRequest> translations) {
        if (translations == null || translations.isEmpty()) {
            throw new ConflictException("At least one translation is required");
        }
        Set<String> locales = new HashSet<>();
        for (LocalizedTextRequest item : translations) {
            String normalizedLocale = normalizeLocale(item.locale());
            if (!locales.add(normalizedLocale)) {
                throw new ConflictException("Duplicate locale is not allowed in role translations");
            }
        }
    }

    private String normalizeLocale(String locale) {
        return locale == null ? null : locale.trim().toLowerCase(Locale.ROOT);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
