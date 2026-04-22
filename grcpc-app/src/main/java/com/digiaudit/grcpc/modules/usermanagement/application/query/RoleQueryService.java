package com.digiaudit.grcpc.modules.usermanagement.application.query;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.LocalizedTextResponse;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.PermissionResponse;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.RoleDetailResponse;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.RoleSummaryResponse;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.*;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoleQueryService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final BusinessPermissionRepository businessPermissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final RoleBusinessPermissionRepository roleBusinessPermissionRepository;
    private final CurrentUserProvider currentUserProvider;
    private final LocalizationSupport localizationSupport;

    @Transactional(readOnly = true)
    public List<RoleSummaryResponse> getRoles(String locale) {
        currentUserProvider.assertCurrentUserIsRoot();
        String normalizedLocale = localizationSupport.normalizeLocale(locale);
        log.debug("Loading roles for UI. locale={}", normalizedLocale);
        return roleRepository.findAll().stream()
                .sorted(Comparator.comparing(RoleEntity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(role -> toSummary(role, normalizedLocale))
                .toList();
    }

    @Transactional(readOnly = true)
    public RoleDetailResponse getRole(UUID roleId, String locale) {
        currentUserProvider.assertCurrentUserIsRoot();
        String normalizedLocale = localizationSupport.normalizeLocale(locale);
        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> new NotFoundException("Role was not found"));
        log.debug("Loading role detail. roleId={}, locale={}", roleId, normalizedLocale);
        List<PermissionResponse> systemPermissions = rolePermissionRepository.findAllByRole(role).stream()
                .map(RolePermissionEntity::getPermission)
                .map(permission -> toPermission(permission, normalizedLocale))
                .sorted(Comparator.comparing(PermissionResponse::code))
                .toList();
        List<PermissionResponse> businessPermissions = roleBusinessPermissionRepository.findAllByRole(role).stream()
                .map(RoleBusinessPermissionEntity::getBusinessPermission)
                .map(permission -> toBusinessPermission(permission, normalizedLocale))
                .sorted(Comparator.comparing(PermissionResponse::code))
                .toList();

        return new RoleDetailResponse(
                role.getId(),
                role.getCode(),
                role.isSystemDefined(),
                role.isEnabled(),
                role.getCreatedAt(),
                role.getUpdatedAt(),
                localizationSupport.sortTranslations(role.getTranslations().stream()
                        .map(item -> new LocalizedTextResponse(item.getLocale(), item.getTitle(), item.getDescription()))
                        .toList()),
                systemPermissions,
                businessPermissions
        );
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> getSystemPermissions(String locale) {
        currentUserProvider.assertCurrentUserIsRoot();
        String normalizedLocale = localizationSupport.normalizeLocale(locale);
        return permissionRepository.findAll().stream()
                .map(permission -> toPermission(permission, normalizedLocale))
                .sorted(Comparator.comparing(PermissionResponse::moduleName).thenComparing(PermissionResponse::code))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> getBusinessPermissions(String locale) {
        currentUserProvider.assertCurrentUserIsRoot();
        String normalizedLocale = localizationSupport.normalizeLocale(locale);
        return businessPermissionRepository.findAll().stream()
                .map(permission -> toBusinessPermission(permission, normalizedLocale))
                .sorted(Comparator.comparing(PermissionResponse::moduleName).thenComparing(PermissionResponse::code))
                .toList();
    }

    private RoleSummaryResponse toSummary(RoleEntity role, String locale) {
        LocalizedTextResponse text = localizationSupport.resolveRoleText(role.getTranslations(), locale)
                .orElse(new LocalizedTextResponse(locale, role.getCode(), null));
        return new RoleSummaryResponse(
                role.getId(),
                role.getCode(),
                text.title(),
                text.description(),
                role.isSystemDefined(),
                role.isEnabled(),
                role.getCreatedAt()
        );
    }

    private PermissionResponse toPermission(PermissionEntity permission, String locale) {
        LocalizedTextResponse text = localizationSupport.resolvePermissionText(permission.getTranslations(), locale)
                .orElse(new LocalizedTextResponse(locale, permission.getCode(), null));
        return new PermissionResponse(
                permission.getId(),
                permission.getCode(),
                permission.getModuleName(),
                text.title(),
                text.description(),
                permission.getCreatedAt()
        );
    }

    private PermissionResponse toBusinessPermission(BusinessPermissionEntity permission, String locale) {
        LocalizedTextResponse text = localizationSupport.resolveBusinessPermissionText(permission.getTranslations(), locale)
                .orElse(new LocalizedTextResponse(locale, permission.getCode(), null));
        return new PermissionResponse(
                permission.getId(),
                permission.getCode(),
                permission.getModuleName(),
                text.title(),
                text.description(),
                permission.getCreatedAt()
        );
    }
}
