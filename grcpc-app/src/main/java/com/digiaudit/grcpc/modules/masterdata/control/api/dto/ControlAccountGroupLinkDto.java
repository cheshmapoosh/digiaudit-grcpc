package com.digiaudit.grcpc.modules.masterdata.control.api.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ControlAccountGroupLinkDto(
        UUID id,
        UUID controlAssignmentId,
        UUID accountGroupId,
        String code,
        String title,
        String description,
        String assertionType,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
