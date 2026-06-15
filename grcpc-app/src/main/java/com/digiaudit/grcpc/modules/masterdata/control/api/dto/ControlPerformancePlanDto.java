package com.digiaudit.grcpc.modules.masterdata.control.api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record ControlPerformancePlanDto(
        UUID id,
        UUID controlAssignmentId,
        String title,
        String description,
        String frequency,
        String ownerName,
        LocalDate plannedDate,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
