package com.digiaudit.grcpc.modules.organization.domain.repository;

import com.digiaudit.grcpc.modules.organization.domain.OrganizationOwnerAssignment;
import java.util.*;

public interface OrganizationOwnerAssignmentRepository {
    record OwnerOption(UUID id, String displayLabel, String username, String roleCode) {}
    List<OwnerOption> eligibleUsers(UUID profileId);
    List<OrganizationOwnerAssignment> assignments(UUID profileId, UUID organizationId);
    List<OrganizationOwnerAssignment> activeForUser(UUID profileId, UUID userId);
    OwnerOption userIdentity(UUID userId);
    OrganizationOwnerAssignment insert(UUID profileId, UUID organizationId, UUID userId, UUID actorId);
    OrganizationOwnerAssignment changeStatus(OrganizationOwnerAssignment row, String status, UUID actorId);
}
