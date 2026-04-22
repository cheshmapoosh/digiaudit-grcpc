package com.digiaudit.grcpc.modules.usermanagement.api.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record UserDetailResponse(
        UUID id,
        String username,
        String firstName,
        String lastName,
        String mobile,
        String email,
        boolean enabled,
        boolean locked,
        boolean rootUser,
        UUID defaultOrgUnitId,
        LocalDateTime lastLoginAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<UserRoleAssignmentResponse> assignments
) {
}
