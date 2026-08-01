package com.digiaudit.grcpc.modules.document.domain;

import java.util.Objects;
import java.util.UUID;

public record DocumentTargetContext(
        DocumentLinkTargetType targetType,
        UUID targetId,
        String authorizationResourceType,
        UUID authorizationResourceId
) {
    public DocumentTargetContext {
        Objects.requireNonNull(targetType, "targetType is required");
        Objects.requireNonNull(targetId, "targetId is required");
        Objects.requireNonNull(authorizationResourceType, "authorizationResourceType is required");
        Objects.requireNonNull(authorizationResourceId, "authorizationResourceId is required");
    }
}
