package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.document.domain.DocumentTargetContext;

import java.util.UUID;

public interface DocumentTargetContextResolver {
    DocumentTargetContext resolvePublic(DocumentLinkTargetType targetType, UUID targetId);

    default void assertMutable(DocumentLinkTargetType targetType, UUID targetId) {
        // Most targets use their normal lifecycle existence check. Targets with stricter
        // business immutability override this hook and acquire the authoritative row lock.
    }
}
