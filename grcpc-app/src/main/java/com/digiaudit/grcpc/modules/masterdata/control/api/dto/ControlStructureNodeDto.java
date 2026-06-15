package com.digiaudit.grcpc.modules.masterdata.control.api.dto;

import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;

@Builder
public record ControlStructureNodeDto(
        UUID id,
        String nodeType,
        String code,
        String title,
        String description,
        UUID parentId,
        UUID processId,
        UUID subProcessId,
        UUID controlId,
        UUID controlAssignmentId,
        String status,
        Integer sortOrder,
        UUID ownerId,
        String ownerName,
        LocalDate validFrom,
        LocalDate validTo
) {
}
