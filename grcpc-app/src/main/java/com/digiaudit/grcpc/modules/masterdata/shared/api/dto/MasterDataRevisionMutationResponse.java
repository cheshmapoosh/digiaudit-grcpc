package com.digiaudit.grcpc.modules.masterdata.shared.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;

import java.util.UUID;

public record MasterDataRevisionMutationResponse(
        UUID entityId,
        UUID revisionId,
        long version
) {
    public static MasterDataRevisionMutationResponse from(MasterDataMutationResult result) {
        return new MasterDataRevisionMutationResponse(result.entityId(), result.revisionId(), result.version());
    }
}
