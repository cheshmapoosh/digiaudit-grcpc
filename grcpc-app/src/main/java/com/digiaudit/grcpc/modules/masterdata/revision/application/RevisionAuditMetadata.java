package com.digiaudit.grcpc.modules.masterdata.revision.application;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record RevisionAuditMetadata(UUID actorId, Instant occurredAt) {
    public RevisionAuditMetadata {
        Objects.requireNonNull(actorId, "actorId is required");
        Objects.requireNonNull(occurredAt, "occurredAt is required");
    }
}
