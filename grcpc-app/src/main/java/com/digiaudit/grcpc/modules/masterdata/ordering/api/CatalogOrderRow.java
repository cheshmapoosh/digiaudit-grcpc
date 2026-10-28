package com.digiaudit.grcpc.modules.masterdata.ordering.api;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import java.time.Instant;
import java.util.UUID;

public record CatalogOrderRow(RevisionEntityType entityType, UUID id, RevisionEntityType parentType,
        UUID parentId, Long displayOrder, long version, Instant createdAt) {
    public CatalogOrderRequest.Key key() { return new CatalogOrderRequest.Key(entityType, id); }
}
