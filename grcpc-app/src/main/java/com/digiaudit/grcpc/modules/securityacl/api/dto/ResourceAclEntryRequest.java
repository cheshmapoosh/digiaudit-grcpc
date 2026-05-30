package com.digiaudit.grcpc.modules.securityacl.api.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ResourceAclEntryRequest(
        String targetType,
        UUID targetId,
        String subjectType,
        UUID subjectId,
        String permissionCode,
        String effect,
        LocalDateTime validFrom,
        LocalDateTime validTo
) {
}
