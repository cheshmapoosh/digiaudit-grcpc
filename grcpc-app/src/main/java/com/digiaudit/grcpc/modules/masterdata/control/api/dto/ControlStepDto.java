package com.digiaudit.grcpc.modules.masterdata.control.api.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ControlStepDto(
        UUID id,
        UUID controlAssignmentId,
        String title,
        String description,
        String requiredDocument,
        String requiredNote,
        String sensitivity,
        Integer sortOrder,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
