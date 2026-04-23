package com.digiaudit.grcpc.modules.organization.api.dto;

import com.digiaudit.grcpc.modules.organization.domain.enums.OrganizationStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateOrganizationStatusRequest(
        @NotNull
        OrganizationStatus status
) {
}
