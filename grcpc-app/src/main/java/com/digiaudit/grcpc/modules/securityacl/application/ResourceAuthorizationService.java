package com.digiaudit.grcpc.modules.securityacl.application;

import com.digiaudit.grcpc.common.security.CurrentUser;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.securityacl.domain.entity.ResourceAclEntryEntity;
import com.digiaudit.grcpc.modules.securityacl.domain.repository.ResourceAclEntryRepository;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.AppUserRepository;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

@Slf4j
@Service("resourceAuthorizationService")
@RequiredArgsConstructor
public class ResourceAuthorizationService {

    private final ResourceAclEntryRepository aclRepository;
    private final AppUserRepository appUserRepository;
    private final CurrentUserProvider currentUserProvider;

    public boolean canAccess(String targetType, UUID targetId, String permissionCode) {
        Optional<CurrentUser> principal = currentUserProvider.getCurrentPrincipalOptional();
        if (principal.isEmpty()) {
            log.debug("Resource authorization denied for anonymous principal. targetType={}, targetId={}, permission={}", targetType, targetId, permissionCode);
            return false;
        }
        CurrentUser user = principal.get();
        if (user.isRootUser()) {
            return true;
        }

        List<UUID> roleIds = appUserRepository.findActiveRoleIds(user.getUserId());
        List<ResourceAclEntryEntity> entries = new ArrayList<>();
        entries.addAll(aclRepository.findByTargetTypeAndTargetIdAndSubjectTypeAndSubjectIdIn(targetType, targetId, "USER", List.of(user.getUserId())));
        if (!roleIds.isEmpty()) {
            entries.addAll(aclRepository.findByTargetTypeAndTargetIdAndSubjectTypeAndSubjectIdIn(targetType, targetId, "ROLE", roleIds));
        }

        LocalDateTime now = LocalDateTime.now();
        boolean denied = entries.stream().filter(item -> isActive(item, now)).anyMatch(item -> permissionMatches(item, permissionCode) && "DENY".equals(item.getEffect()));
        if (denied) {
            log.info("Resource authorization denied by ACL. userId={}, targetType={}, targetId={}, permission={}", user.getUserId(), targetType, targetId, permissionCode);
            return false;
        }

        boolean allowedByAcl = entries.stream().filter(item -> isActive(item, now)).anyMatch(item -> permissionMatches(item, permissionCode) && "ALLOW".equals(item.getEffect()));
        if (allowedByAcl) {
            return true;
        }

        boolean allowedByAuthority = user.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority -> authority.equals(permissionCode));
        log.debug("Resource authorization fallback to authority. userId={}, targetType={}, targetId={}, permission={}, allowed={}", user.getUserId(), targetType, targetId, permissionCode, allowedByAuthority);
        return allowedByAuthority;
    }

    public void assertCanAccess(String targetType, UUID targetId, String permissionCode) {
        if (!canAccess(targetType, targetId, permissionCode)) {
            throw new com.digiaudit.grcpc.common.exception.ForbiddenException("RESOURCE_ACCESS_DENIED", "error.security.forbidden", "Access denied for " + permissionCode + " on " + targetType + "/" + targetId);
        }
    }

    private boolean isActive(ResourceAclEntryEntity entry, LocalDateTime now) {
        return (entry.getValidFrom() == null || !entry.getValidFrom().isAfter(now))
                && (entry.getValidTo() == null || !entry.getValidTo().isBefore(now));
    }

    private boolean permissionMatches(ResourceAclEntryEntity entry, String permissionCode) {
        return "ADMIN".equals(entry.getPermissionCode()) || entry.getPermissionCode().equals(permissionCode);
    }
}
