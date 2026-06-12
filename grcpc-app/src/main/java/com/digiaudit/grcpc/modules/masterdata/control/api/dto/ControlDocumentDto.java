package com.digiaudit.grcpc.modules.masterdata.control.api.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ControlDocumentDto(
        UUID id,
        UUID controlAssignmentId,
        String name,
        String documentType,
        String description,
        String fileRef,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
