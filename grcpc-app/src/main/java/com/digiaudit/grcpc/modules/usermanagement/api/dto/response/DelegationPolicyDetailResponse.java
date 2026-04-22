package com.digiaudit.grcpc.modules.usermanagement.api.dto.response;

import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ManageableUserMode;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.SubjectType;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record DelegationPolicyDetailResponse(
        UUID id,
        SubjectType subjectType,
        UUID subjectRoleId,
        String subjectRoleCode,
        String subjectRoleTitle,
        UUID subjectUserId,
        String subjectUsername,
        boolean allowCreateUser,
        boolean allowEditUser,
        boolean allowDisableUser,
        boolean allowAssignRoles,
        boolean allowCreateRole,
        boolean allowEditRole,
        boolean allowAssignBusinessPermissions,
        ScopeType scopeType,
        UUID scopeOrgUnitId,
        boolean allowSubtree,
        ManageableUserMode manageableUserMode,
        boolean enabled,
        List<RoleSummaryResponse> assignableRoles,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
