package com.digiaudit.grcpc.modules.usermanagement.api.dto.request;

import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ManageableUserMode;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType;
import jakarta.validation.constraints.NotNull;

import java.util.Set;
import java.util.UUID;

public record UpdateDelegationPolicyRequest(
        boolean allowCreateUser,
        boolean allowEditUser,
        boolean allowDisableUser,
        boolean allowAssignRoles,
        boolean allowCreateRole,
        boolean allowEditRole,
        boolean allowAssignBusinessPermissions,
        @NotNull ScopeType scopeType,
        UUID scopeOrgUnitId,
        boolean allowSubtree,
        @NotNull ManageableUserMode manageableUserMode,
        boolean enabled,
        Set<UUID> assignableRoleIds
) {
}
