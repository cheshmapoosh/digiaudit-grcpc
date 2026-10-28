package com.digiaudit.grcpc.modules.organization.api.dto;

import java.util.UUID;

public record OrganizationOwnerView(UUID assignmentId, UUID profileId, UUID organizationId, UUID userId,
        String displayLabel, String username, String roleCode, boolean eligible, long version) {}
