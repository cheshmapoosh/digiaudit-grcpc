package com.digiaudit.grcpc.modules.organization.domain;

import java.time.Instant;
import java.util.UUID;

public record OrganizationOwnerAssignment(UUID id, UUID profileId, UUID organizationId, UUID userId,
        String status, long version, Instant createdAt, Instant updatedAt, UUID createdBy, UUID updatedBy,
        Instant deletedAt, UUID deletedBy) {}
