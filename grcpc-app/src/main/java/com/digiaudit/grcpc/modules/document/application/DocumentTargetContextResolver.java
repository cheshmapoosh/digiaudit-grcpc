package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.document.domain.DocumentTargetContext;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;

import java.util.UUID;

public interface DocumentTargetContextResolver {
    DocumentTargetContext resolvePublic(DocumentLinkTargetType targetType, UUID targetId);

    DocumentTargetContext sameRevisionEvidence(RevisionExecutionContext context);
}
