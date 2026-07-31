package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;

import java.time.LocalDate;
import java.util.UUID;

public final class DocumentCommands {
    private DocumentCommands() {
    }

    public record CreateLinkedDocument(
            UUID tempUploadId,
            String code,
            String title,
            String description,
            String documentCategoryCode,
            DocumentLinkTargetType targetType,
            UUID targetId,
            LocalDate validFrom,
            LocalDate validTo
    ) {
    }

    public record AddVersion(
            UUID documentId,
            UUID tempUploadId,
            Long expectedDocumentVersion,
            DocumentLinkTargetType targetType,
            UUID targetId,
            LocalDate validFrom,
            LocalDate validTo
    ) {
    }

    public record UpdateMetadata(
            UUID documentId,
            Long expectedVersion,
            DocumentLinkTargetType targetType,
            UUID targetId,
            PatchValue<String> code,
            PatchValue<String> title,
            PatchValue<String> description,
            PatchValue<String> documentCategoryCode,
            PatchValue<LocalDate> validFrom,
            PatchValue<LocalDate> validTo
    ) {
    }

    public record DocumentLifecycle(
            UUID documentId,
            Long expectedVersion,
            DocumentLinkTargetType targetType,
            UUID targetId,
            LifecycleAction action
    ) {
    }

    public record LinkExistingVersion(
            UUID documentVersionId,
            DocumentLinkTargetType targetType,
            UUID targetId
    ) {
    }

    public record LinkLifecycle(
            UUID linkId,
            Long expectedVersion,
            LifecycleAction action
    ) {
    }

    public enum LifecycleAction {
        ACTIVATE,
        INACTIVATE,
        DELETE,
        RESTORE
    }
}
