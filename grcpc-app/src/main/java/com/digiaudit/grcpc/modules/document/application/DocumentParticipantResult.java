package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;

import java.util.List;
import java.util.UUID;

public record DocumentParticipantResult(
        MasterDataMutationResult primaryResult,
        List<RevisionContentResult> contentResults,
        UUID documentId,
        UUID documentVersionId,
        long documentVersionNumber,
        UUID documentLinkId
) {
}
