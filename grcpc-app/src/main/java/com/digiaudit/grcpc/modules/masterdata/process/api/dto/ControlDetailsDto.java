package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import com.digiaudit.grcpc.modules.masterdata.process.domain.enums.ControlAssignmentStatus;
import com.digiaudit.grcpc.modules.masterdata.process.domain.enums.ControlAutomationType;
import com.digiaudit.grcpc.modules.masterdata.process.domain.enums.ControlImportance;
import com.digiaudit.grcpc.modules.masterdata.process.domain.enums.ControlNature;
import com.digiaudit.grcpc.modules.masterdata.process.domain.enums.ControlStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;

@Builder
public record ControlDetailsDto(
        UUID controlAssignmentId,
        UUID controlId,
        String code,
        String name,
        String description,
        String controlClass,
        ControlNature controlNature,
        ControlAutomationType automationType,
        ControlImportance importance,
        String objective,
        UUID parentProcessId,
        String parentProcessTitle,
        UUID parentSubProcessId,
        String parentSubProcessTitle,
        UUID ownerId,
        String ownerName,
        LocalDate validFrom,
        LocalDate validTo,
        Integer sortOrder,
        String operationPeriod,
        String testMethod,
        String testPlan,
        ControlStatus status,
        ControlAssignmentStatus assignmentStatus,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
