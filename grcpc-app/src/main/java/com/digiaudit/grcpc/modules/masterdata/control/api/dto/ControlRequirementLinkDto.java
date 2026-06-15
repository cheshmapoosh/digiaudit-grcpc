package com.digiaudit.grcpc.modules.masterdata.control.api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record ControlRequirementLinkDto(
        UUID id,
        UUID controlAssignmentId,
        UUID requirementId,
        UUID regulationId,
        String code,
        String title,
        String description,
        String regulationTitle,
        LocalDate validFrom,
        LocalDate validTo,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
