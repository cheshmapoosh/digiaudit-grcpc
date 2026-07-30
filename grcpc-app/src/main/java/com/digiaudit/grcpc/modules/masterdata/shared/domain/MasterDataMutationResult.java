package com.digiaudit.grcpc.modules.masterdata.shared.domain;

import java.util.Objects;
import java.util.UUID;

public record MasterDataMutationResult(UUID entityId, UUID revisionId, long version) {
    public MasterDataMutationResult {
        Objects.requireNonNull(entityId, "entityId is required");
        Objects.requireNonNull(revisionId, "revisionId is required");
        if (version < 0) {
            throw new IllegalArgumentException("version must not be negative");
        }
    }
}
