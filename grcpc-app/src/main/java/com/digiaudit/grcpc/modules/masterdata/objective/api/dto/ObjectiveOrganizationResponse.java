package com.digiaudit.grcpc.modules.masterdata.objective.api.dto;

import java.util.UUID;

public record ObjectiveOrganizationResponse(
        UUID organizationId,
        String organizationCode,
        String organizationName,
        String organizationStatus
) {
}
