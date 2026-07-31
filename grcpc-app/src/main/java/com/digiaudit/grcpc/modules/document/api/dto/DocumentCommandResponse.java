package com.digiaudit.grcpc.modules.document.api.dto;

import java.util.UUID;

public record DocumentCommandResponse(
        UUID entityId,
        UUID revisionId,
        long documentVersion,
        UUID documentVersionId,
        long documentVersionNumber,
        UUID documentLinkId,
        DocumentLinkSummaryResponse summary
) {
}
