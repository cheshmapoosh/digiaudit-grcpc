package com.digiaudit.grcpc.modules.usermanagement.api.dto;

import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ManageableUserMode;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.SubjectType;
import jakarta.validation.constraints.NotNull;

import java.util.Set;
import java.util.UUID;

public record CreateDelegationPolicyRequest(
        @NotNull SubjectType subjectType,
        UUID subjectRoleId,
        UUID subjectUserId,
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
