package com.digiaudit.grcpc.modules.masterdata.security;

import com.digiaudit.grcpc.common.exception.ForbiddenException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.AppUserRepository;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Master Data access only. Business scope, coverage and Central/Local are not security scopes. */
@Service("masterDataAuthorization")
@RequiredArgsConstructor
public class MasterDataAuthorizationService {
    private static final Set<String> AREAS = Set.of("PROCESS", "RISK", "CONTROL", "GOVERNANCE", "REFERENCE");
    private final CurrentUserProvider currentUserProvider;
    private final AppUserRepository users;

    public boolean canView(String area) {
        return allowed(area, false);
    }

    public boolean canManage(String area) {
        return allowed(area, true);
    }

    public boolean canViewAny() {
        return AREAS.stream().anyMatch(this::canView);
    }

    public boolean canManageAny() {
        return AREAS.stream().anyMatch(this::canManage);
    }

    public void requireManageWithReference(String ownerArea, String referenceArea) {
        if (!canManage(ownerArea) || !canView(referenceArea)) {
            throw new ForbiddenException("MASTER_DATA_ACCESS_DENIED", "error.security.forbidden",
                    "Master Data aggregate access denied");
        }
    }

    public void requireManageWithReferences(String ownerArea, String... referenceAreas) {
        if (!canManage(ownerArea)
                || java.util.Arrays.stream(referenceAreas).anyMatch(area -> !canView(area))) {
            throw new ForbiddenException("MASTER_DATA_ACCESS_DENIED", "error.security.forbidden",
                    "Master Data aggregate access denied");
        }
    }

    private boolean allowed(String area, boolean manage) {
        if (!AREAS.contains(area)) return false;
        return currentUserProvider.getCurrentPrincipalOptional().map(principal -> {
            if (principal.isRootUser()) return true;
            // Read live assignments: expiry, deactivation and role changes apply to existing sessions.
            // Only GLOBAL/null assignments qualify. Organization scopes deliberately fail closed.
            var user = users.findById(principal.getUserId()).orElse(null);
            if (user == null || !user.isEnabled() || user.isLocked()) return false;
            var permissions = users.findActiveBusinessPermissionCodes(principal.getUserId());
            return permissions.contains("MD_" + area + "_MANAGE")
                    || (!manage && permissions.contains("MD_" + area + "_VIEW"));
        }).orElse(false);
    }
}
