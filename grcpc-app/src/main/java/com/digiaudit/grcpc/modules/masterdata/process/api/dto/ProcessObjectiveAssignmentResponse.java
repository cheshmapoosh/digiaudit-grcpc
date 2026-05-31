package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;

@Builder
public record ProcessObjectiveAssignmentResponse(
        UUID assignmentId,
        UUID processNodeId,
        UUID objectiveNodeId,
        String code,
        String title,
        String description,
        String status,
        String assignmentType,
        LocalDate validFrom,
        LocalDate validTo,
        Boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
