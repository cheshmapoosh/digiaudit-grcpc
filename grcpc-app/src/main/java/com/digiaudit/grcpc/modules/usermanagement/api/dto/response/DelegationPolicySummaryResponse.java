package com.digiaudit.grcpc.modules.usermanagement.api.dto.response;

import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ManageableUserMode;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.SubjectType;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

public record DelegationPolicySummaryResponse(
        UUID id,
        SubjectType subjectType,
        UUID subjectRoleId,
        String subjectRoleCode,
        String subjectRoleTitle,
        UUID subjectUserId,
        String subjectUsername,
        ScopeType scopeType,
        UUID scopeOrgUnitId,
        boolean enabled,
        boolean allowCreateUser,
        boolean allowEditUser,
        boolean allowDisableUser,
        boolean allowAssignRoles,
        boolean allowCreateRole,
        boolean allowEditRole,
        boolean allowAssignBusinessPermissions,
        boolean allowSubtree,
        ManageableUserMode manageableUserMode,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
