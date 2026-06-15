package com.digiaudit.grcpc.modules.masterdata.control.api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record ControlRegulationLinkDto(
        UUID id,
        UUID controlAssignmentId,
        UUID regulationId,
        String code,
        String title,
        String description,
        LocalDate validFrom,
        LocalDate validTo,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
