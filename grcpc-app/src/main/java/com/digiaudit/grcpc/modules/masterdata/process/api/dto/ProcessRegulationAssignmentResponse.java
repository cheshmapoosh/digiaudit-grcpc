package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;

@Builder
public record ProcessRegulationAssignmentResponse(
        UUID assignmentId,
        UUID processNodeId,
        UUID regulationNodeId,
        String code,
        String title,
        String description,
        String issuer,
        RegulationStatus status,
        LocalDate validFrom,
        LocalDate validTo,
        Boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
