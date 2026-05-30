package com.digiaudit.grcpc.modules.securityacl.api.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;

@Builder
public record ResourceAclEntryResponse(
        UUID id,
        String targetType,
        UUID targetId,
        String subjectType,
        UUID subjectId,
        String permissionCode,
        String effect,
        LocalDateTime validFrom,
        LocalDateTime validTo,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        UUID createdBy,
        UUID updatedBy
) {
}
