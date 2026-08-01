package com.digiaudit.grcpc.modules.document.api.dto;

import java.util.UUID;

public record DocumentCommandResponse(
        UUID entityId,
        UUID documentId,
        long documentVersion,
        UUID documentVersionId,
        Long documentVersionNumber,
        UUID documentLinkId,
        Long documentLinkVersion,
        DocumentLinkSummaryResponse summary
) {
}
