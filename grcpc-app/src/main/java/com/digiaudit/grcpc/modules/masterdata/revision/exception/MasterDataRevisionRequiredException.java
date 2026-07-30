package com.digiaudit.grcpc.modules.masterdata.revision.exception;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataErrorCode;

import java.util.UUID;

public final class MasterDataRevisionRequiredException extends ConflictException {
    private MasterDataRevisionRequiredException(String developerMessage, Object... messageArgs) {
        super(
                MasterDataErrorCode.MASTERDATA_REVISION_REQUIRED.code(),
                "error.masterdata.v2.revisionRequired",
                developerMessage,
                messageArgs
        );
    }

    public static MasterDataRevisionRequiredException missing() {
        return new MasterDataRevisionRequiredException("Master Data mutation requires an explicit revision context");
    }

    public static MasterDataRevisionRequiredException notDraft(UUID revisionId) {
        return new MasterDataRevisionRequiredException("Revision context is not draft: " + revisionId, revisionId);
    }
}
