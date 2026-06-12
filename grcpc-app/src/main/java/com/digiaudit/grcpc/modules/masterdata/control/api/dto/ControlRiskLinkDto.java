package com.digiaudit.grcpc.modules.masterdata.control.api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record ControlRiskLinkDto(
        UUID id,
        UUID controlAssignmentId,
        UUID riskId,
        String code,
        String title,
        String description,
        String source,
        String organizationTitle,
        LocalDate validFrom,
        LocalDate validTo,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
