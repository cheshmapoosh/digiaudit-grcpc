package com.digiaudit.grcpc.modules.masterdata.objective.api.dto;

import com.digiaudit.grcpc.modules.organization.domain.enums.OrganizationStatus;
import java.util.UUID;

public record ObjectiveOrganizationResponse(
        UUID organizationId,
        String organizationCode,
        String organizationName,
        OrganizationStatus organizationStatus
) {
}
