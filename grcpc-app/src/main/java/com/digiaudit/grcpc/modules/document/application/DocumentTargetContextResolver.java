package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.document.domain.DocumentTargetContext;

import java.util.UUID;

public interface DocumentTargetContextResolver {
    DocumentTargetContext resolvePublic(DocumentLinkTargetType targetType, UUID targetId);
}
