package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.modules.document.application.DocumentCommands.AddVersion;
import com.digiaudit.grcpc.modules.document.application.DocumentCommands.CreateLinkedDocument;
import com.digiaudit.grcpc.modules.document.application.DocumentCommands.DocumentLifecycle;
import com.digiaudit.grcpc.modules.document.application.DocumentCommands.LifecycleAction;
import com.digiaudit.grcpc.modules.document.application.DocumentCommands.LinkExistingVersion;
import com.digiaudit.grcpc.modules.document.application.DocumentCommands.LinkLifecycle;
import com.digiaudit.grcpc.modules.document.application.DocumentCommands.UpdateMetadata;
import com.digiaudit.grcpc.modules.document.domain.DocumentLifecycleStatus;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.document.domain.DocumentTargetContext;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentLinkEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentTempUploadEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentVersionEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.InternalDocumentJpaRepository;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.InternalDocumentLinkJpaRepository;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.InternalDocumentTempUploadJpaRepository;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.InternalDocumentVersionJpaRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionDomain;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class DocumentRevisionParticipant {
    private final InternalDocumentJpaRepository documentRepository;
    private final InternalDocumentVersionJpaRepository versionRepository;
    private final InternalDocumentLinkJpaRepository linkRepository;
    private final InternalDocumentTempUploadJpaRepository tempUploadRepository;
    private final DocumentTempUploadStateService tempUploadStateService;
    private final DocumentStoragePort storagePort;
    private final DocumentObjectKeyService objectKeyService;
    private final DocumentPromotionRollbackRegistry rollbackRegistry;
    private final DocumentTargetContextResolver targetContextResolver;
    private final DocumentValidation validation;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public DocumentRevisionParticipant(
            InternalDocumentJpaRepository documentRepository,
            InternalDocumentVersionJpaRepository versionRepository,
            InternalDocumentLinkJpaRepository linkRepository,
            InternalDocumentTempUploadJpaRepository tempUploadRepository,
            DocumentTempUploadStateService tempUploadStateService,
            DocumentStoragePort storagePort,
            DocumentObjectKeyService objectKeyService,
            DocumentPromotionRollbackRegistry rollbackRegistry,
            DocumentTargetContextResolver targetContextResolver,
            DocumentValidation validation,
            ObjectMapper objectMapper,
            @Qualifier("masterDataRevisionClock") Clock clock
    ) {
        this.documentRepository = Objects.requireNonNull(documentRepository, "documentRepository is required");
        this.versionRepository = Objects.requireNonNull(versionRepository, "versionRepository is required");
        this.linkRepository = Objects.requireNonNull(linkRepository, "linkRepository is required");
        this.tempUploadRepository = Objects.requireNonNull(tempUploadRepository, "tempUploadRepository is required");
        this.tempUploadStateService = Objects.requireNonNull(tempUploadStateService, "tempUploadStateService is required");
        this.storagePort = Objects.requireNonNull(storagePort, "storagePort is required");
        this.objectKeyService = Objects.requireNonNull(objectKeyService, "objectKeyService is required");
        this.rollbackRegistry = Objects.requireNonNull(rollbackRegistry, "rollbackRegistry is required");
        this.targetContextResolver = Objects.requireNonNull(targetContextResolver, "targetContextResolver is required");
        this.validation = Objects.requireNonNull(validation, "validation is required");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper is required");
        this.clock = Objects.requireNonNull(clock, "clock is required");
    }

    public DocumentParticipantResult createLinkedDocument(
            RevisionExecutionContext context,
            CreateLinkedDocument command,
            DocumentTargetContext targetContext,
            UUID actorId
    ) {
        assertTargetMatchesRevision(context, targetContext);
        Instant now = Instant.now(clock);
        validation.validateDateRange(command.validFrom(), command.validTo());
        String title = validation.requiredText(command.title(), 255, "INVALID_DOCUMENT_TITLE", "Document title");
        String code = validation.nullableText(command.code(), 64, "INVALID_DOCUMENT_CODE", "Document code");
        String category = validation.nullableText(command.documentCategoryCode(), 64, "INVALID_DOCUMENT_CATEGORY", "Document category");

        UUID documentId = UUID.randomUUID();
        UUID documentVersionId = UUID.randomUUID();
        UUID documentLinkId = UUID.randomUUID();
        PromotedUpload promotedUpload = consumeUploadAndPromote(command.tempUploadId(), actorId, now, documentVersionId, false);

        DocumentEntity document = DocumentEntity.create(
                documentId,
                code,
                title,
                normalizeText(command.description()),
                category,
                command.validFrom(),
                command.validTo(),
                actorId,
                now
        );
        documentRepository.save(document);
        documentRepository.flush();

        DocumentVersionEntity version = DocumentVersionEntity.create(
                documentVersionId,
                documentId,
                1L,
                promotedUpload.tempUpload().getOriginalFileName(),
                promotedUpload.tempUpload().getMimeType(),
                promotedUpload.tempUpload().getFileSize(),
                promotedUpload.permanentObjectKey(),
                promotedUpload.tempUpload().getChecksumAlgorithm(),
                promotedUpload.tempUpload().getChecksumValue(),
                command.validFrom(),
                command.validTo(),
                actorId,
                now
        );
        versionRepository.save(version);
        versionRepository.flush();

        DocumentLinkEntity link = DocumentLinkEntity.create(
                documentLinkId,
                documentVersionId,
                targetContext.targetType(),
                targetContext.targetId(),
                actorId,
                now
        );
        linkRepository.save(link);
        linkRepository.flush();

        promotedUpload.tempUpload().consume(documentVersionId, now);
        tempUploadRepository.flush();

        List<RevisionContentResult> contents = List.of(
                completed(RevisionEntityType.DOCUMENT, document.getId(), RevisionOperationType.CREATE, null, null, documentSnapshot(document), document.getVersion(), validationSnapshot(targetContext)),
                completed(RevisionEntityType.DOCUMENT_VERSION, version.getId(), RevisionOperationType.CREATE, null, null, versionSnapshot(version), version.getVersion(), validationSnapshot(targetContext)),
                completed(RevisionEntityType.DOCUMENT_LINK, link.getId(), RevisionOperationType.CREATE, null, null, linkSnapshot(link), link.getVersion(), validationSnapshot(targetContext))
        );
        MasterDataMutationResult primary = new MasterDataMutationResult(document.getId(), context.revisionId(), document.getVersion());
        return new DocumentParticipantResult(primary, contents, document.getId(), version.getId(), version.getDocumentVersionNumber(), link.getId());
    }

    public DocumentParticipantResult addVersion(
            RevisionExecutionContext context,
            AddVersion command,
            DocumentTargetContext targetContext,
            UUID actorId
    ) {
        assertTargetMatchesRevision(context, targetContext);
        validation.requireExpectedVersion(command.expectedDocumentVersion());
        validation.validateDateRange(command.validFrom(), command.validTo());
        Instant now = Instant.now(clock);
        DocumentEntity document = lockDocument(command.documentId());
        requireVersion(document.getVersion(), command.expectedDocumentVersion());
        document.requireNotDeleted();
        JsonNode beforeDocument = documentSnapshot(document);
        UUID documentVersionId = UUID.randomUUID();
        UUID documentLinkId = UUID.randomUUID();
        long nextVersionNumber = versionRepository.maxVersionNumberForLockedDocument(document.getId()) + 1L;
        PromotedUpload promotedUpload = consumeUploadAndPromote(command.tempUploadId(), actorId, now, documentVersionId, false);

        document.touch(actorId, now);
        documentRepository.save(document);
        documentRepository.flush();

        DocumentVersionEntity version = DocumentVersionEntity.create(
                documentVersionId,
                document.getId(),
                nextVersionNumber,
                promotedUpload.tempUpload().getOriginalFileName(),
                promotedUpload.tempUpload().getMimeType(),
                promotedUpload.tempUpload().getFileSize(),
                promotedUpload.permanentObjectKey(),
                promotedUpload.tempUpload().getChecksumAlgorithm(),
                promotedUpload.tempUpload().getChecksumValue(),
                command.validFrom(),
                command.validTo(),
                actorId,
                now
        );
        versionRepository.save(version);
        versionRepository.flush();

        DocumentLinkEntity link = DocumentLinkEntity.create(
                documentLinkId,
                version.getId(),
                targetContext.targetType(),
                targetContext.targetId(),
                actorId,
                now
        );
        linkRepository.save(link);
        linkRepository.flush();

        promotedUpload.tempUpload().consume(version.getId(), now);
        tempUploadRepository.flush();

        List<RevisionContentResult> contents = List.of(
                completed(RevisionEntityType.DOCUMENT, document.getId(), RevisionOperationType.UPDATE, command.expectedDocumentVersion(), beforeDocument, documentSnapshot(document), document.getVersion(), validationSnapshot(targetContext)),
                completed(RevisionEntityType.DOCUMENT_VERSION, version.getId(), RevisionOperationType.CREATE, null, null, versionSnapshot(version), version.getVersion(), validationSnapshot(targetContext)),
                completed(RevisionEntityType.DOCUMENT_LINK, link.getId(), RevisionOperationType.CREATE, null, null, linkSnapshot(link), link.getVersion(), validationSnapshot(targetContext))
        );
        MasterDataMutationResult primary = new MasterDataMutationResult(document.getId(), context.revisionId(), document.getVersion());
        return new DocumentParticipantResult(primary, contents, document.getId(), version.getId(), version.getDocumentVersionNumber(), link.getId());
    }

    public DocumentParticipantResult updateMetadata(
            RevisionExecutionContext context,
            UpdateMetadata command,
            DocumentTargetContext targetContext,
            UUID actorId
    ) {
        assertTargetMatchesRevision(context, targetContext);
        validation.requireExpectedVersion(command.expectedVersion());
        validation.validateDateRange(command.validFrom(), command.validTo());
        Instant now = Instant.now(clock);
        DocumentEntity document = lockDocument(command.documentId());
        requireVersion(document.getVersion(), command.expectedVersion());
        requireActiveDocumentLink(document.getId(), targetContext);
        JsonNode before = documentSnapshot(document);
        document.updateMetadata(
                command.code() == null ? document.getCode() : validation.nullableText(command.code(), 64, "INVALID_DOCUMENT_CODE", "Document code"),
                command.title() == null ? document.getTitle() : validation.requiredText(command.title(), 255, "INVALID_DOCUMENT_TITLE", "Document title"),
                command.description() == null ? document.getDescription() : normalizeText(command.description()),
                command.documentCategoryCode() == null ? document.getDocumentCategoryCode() : validation.nullableText(command.documentCategoryCode(), 64, "INVALID_DOCUMENT_CATEGORY", "Document category"),
                command.validFrom(),
                command.validTo(),
                actorId,
                now
        );
        documentRepository.save(document);
        documentRepository.flush();

        List<RevisionContentResult> contents = List.of(
                completed(RevisionEntityType.DOCUMENT, document.getId(), RevisionOperationType.UPDATE, command.expectedVersion(), before, documentSnapshot(document), document.getVersion(), validationSnapshot(targetContext))
        );
        MasterDataMutationResult primary = new MasterDataMutationResult(document.getId(), context.revisionId(), document.getVersion());
        return new DocumentParticipantResult(primary, contents, document.getId(), null, 0L, null);
    }

    public DocumentParticipantResult documentLifecycle(
            RevisionExecutionContext context,
            DocumentLifecycle command,
            DocumentTargetContext targetContext,
            UUID actorId
    ) {
        assertTargetMatchesRevision(context, targetContext);
        validation.requireExpectedVersion(command.expectedVersion());
        Instant now = Instant.now(clock);
        DocumentEntity document = lockDocument(command.documentId());
        requireVersion(document.getVersion(), command.expectedVersion());
        requireActiveDocumentLink(document.getId(), targetContext);
        JsonNode before = documentSnapshot(document);
        applyDocumentLifecycle(document, command.action(), actorId, now);
        documentRepository.save(document);
        documentRepository.flush();

        RevisionOperationType operationType = operationType(command.action());
        List<RevisionContentResult> contents = List.of(
                completed(RevisionEntityType.DOCUMENT, document.getId(), operationType, command.expectedVersion(), before, documentSnapshot(document), document.getVersion(), validationSnapshot(targetContext))
        );
        MasterDataMutationResult primary = new MasterDataMutationResult(document.getId(), context.revisionId(), document.getVersion());
        return new DocumentParticipantResult(primary, contents, document.getId(), null, 0L, null);
    }

    public DocumentParticipantResult linkExistingVersion(
            RevisionExecutionContext context,
            LinkExistingVersion command,
            DocumentTargetContext targetContext,
            UUID actorId
    ) {
        assertTargetMatchesRevision(context, targetContext);
        Instant now = Instant.now(clock);
        DocumentVersionEntity version = versionRepository.findById(command.documentVersionId())
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_VERSION_NOT_FOUND", "Document version was not found"));
        if (version.getStatus() == DocumentLifecycleStatus.DELETED) {
            throw DocumentFailures.notFound("DOCUMENT_VERSION_NOT_FOUND", "Document version was not found");
        }
        DocumentEntity document = documentRepository.findById(version.getDocumentId())
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_NOT_FOUND", "Document was not found"));
        if (document.getStatus() == DocumentLifecycleStatus.DELETED) {
            throw DocumentFailures.notFound("DOCUMENT_NOT_FOUND", "Document was not found");
        }

        DocumentLinkEntity link = linkRepository.lockByBusinessKey(version.getId(), targetContext.targetType(), targetContext.targetId())
                .orElse(null);
        RevisionOperationType operationType;
        JsonNode before;
        Long expectedVersion;
        if (link == null) {
            link = DocumentLinkEntity.create(UUID.randomUUID(), version.getId(), targetContext.targetType(), targetContext.targetId(), actorId, now);
            before = null;
            expectedVersion = null;
            operationType = RevisionOperationType.CREATE;
        } else if (link.getStatus() == DocumentLifecycleStatus.ACTIVE) {
            throw DocumentFailures.conflict("DUPLICATE_ACTIVE_DOCUMENT_LINK", "An active document link already exists for this version and target");
        } else {
            before = linkSnapshot(link);
            expectedVersion = link.getVersion();
            operationType = link.getStatus() == DocumentLifecycleStatus.DELETED
                    ? RevisionOperationType.RESTORE
                    : RevisionOperationType.ACTIVATE;
            link.restore(actorId, now);
        }
        linkRepository.save(link);
        linkRepository.flush();

        List<RevisionContentResult> contents = List.of(
                completed(RevisionEntityType.DOCUMENT_LINK, link.getId(), operationType, expectedVersion, before, linkSnapshot(link), link.getVersion(), validationSnapshot(targetContext))
        );
        MasterDataMutationResult primary = new MasterDataMutationResult(link.getId(), context.revisionId(), link.getVersion());
        return new DocumentParticipantResult(primary, contents, document.getId(), version.getId(), version.getDocumentVersionNumber(), link.getId());
    }

    public DocumentParticipantResult linkLifecycle(
            RevisionExecutionContext context,
            LinkLifecycle command,
            UUID actorId
    ) {
        validation.requireExpectedVersion(command.expectedVersion());
        Instant now = Instant.now(clock);
        DocumentLinkEntity link = linkRepository.lockById(command.linkId())
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_LINK_NOT_FOUND", "Document link was not found"));
        if (!link.getTargetType().isPublicSelectable()) {
            throw DocumentFailures.invalid("TARGET_NOT_ALLOWED", "Document link target type is not allowed from browser requests");
        }
        DocumentTargetContext targetContext = targetContextResolver.resolvePublic(link.getTargetType(), link.getTargetId());
        assertTargetMatchesRevision(context, targetContext);
        requireVersion(link.getVersion(), command.expectedVersion());
        JsonNode before = linkSnapshot(link);
        applyLinkLifecycle(link, command.action(), actorId, now);
        linkRepository.save(link);
        linkRepository.flush();

        DocumentVersionEntity version = versionRepository.findById(link.getDocumentVersionId())
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_VERSION_NOT_FOUND", "Document version was not found"));
        List<RevisionContentResult> contents = List.of(
                completed(RevisionEntityType.DOCUMENT_LINK, link.getId(), operationType(command.action()), command.expectedVersion(), before, linkSnapshot(link), link.getVersion(), validationSnapshot(targetContext))
        );
        MasterDataMutationResult primary = new MasterDataMutationResult(link.getId(), context.revisionId(), link.getVersion());
        return new DocumentParticipantResult(primary, contents, version.getDocumentId(), version.getId(), version.getDocumentVersionNumber(), link.getId());
    }

    public DocumentParticipantResult createSameRevisionEvidence(
            RevisionExecutionContext context,
            UUID documentVersionId,
            UUID actorId
    ) {
        DocumentTargetContext targetContext = targetContextResolver.sameRevisionEvidence(context);
        return linkExistingVersion(
                context,
                new LinkExistingVersion(documentVersionId, DocumentLinkTargetType.MASTERDATA_REVISION, context.revisionId()),
                targetContext,
                actorId
        );
    }

    private PromotedUpload consumeUploadAndPromote(
            UUID tempUploadId,
            UUID actorId,
            Instant now,
            UUID documentVersionId,
            boolean internalFlow
    ) {
        DocumentTempUploadEntity tempUpload = tempUploadStateService.lockForConsumption(tempUploadId, actorId, now, internalFlow);
        DocumentStoragePort.DocumentObjectMetadata expectedMetadata = new DocumentStoragePort.DocumentObjectMetadata(
                tempUpload.getMimeType(),
                tempUpload.getFileSize(),
                tempUpload.getChecksumAlgorithm(),
                tempUpload.getChecksumValue()
        );
        try {
            verifyStorageMetadata(storagePort.inspectObject(tempUpload.getStorageObjectKey()), expectedMetadata);
            String permanentObjectKey = objectKeyService.permanentKey(tempUpload.getId(), tempUpload.getOriginalFileName());
            DocumentStoragePort.PromotionResult promotion = storagePort.promoteTemporaryObject(
                    tempUpload.getStorageObjectKey(),
                    permanentObjectKey,
                    expectedMetadata
            );
            storagePort.verifyPermanentObject(permanentObjectKey, expectedMetadata);
            if (promotion.createdByThisAttempt()) {
                rollbackRegistry.removePermanentObjectOnRollback(permanentObjectKey, tempUpload.getId(), documentVersionId);
            }
            return new PromotedUpload(tempUpload, permanentObjectKey);
        } catch (DocumentStorageException ex) {
            throw DocumentTemporaryUploadService.storageFailure(ex);
        }
    }

    private void verifyStorageMetadata(
            DocumentStoragePort.DocumentObjectMetadata actual,
            DocumentStoragePort.DocumentObjectMetadata expected
    ) {
        if (actual.fileSize() != expected.fileSize()
                || !Objects.equals(actual.mimeType(), expected.mimeType())
                || !Objects.equals(actual.checksumAlgorithm(), expected.checksumAlgorithm())
                || !Objects.equals(actual.checksumValue(), expected.checksumValue())) {
            throw new DocumentStorageException("TEMPORARY_OBJECT_METADATA_MISMATCH", "Temporary upload metadata mismatch");
        }
    }

    private DocumentEntity lockDocument(UUID documentId) {
        return documentRepository.lockById(documentId)
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_NOT_FOUND", "Document was not found"));
    }

    private void requireVersion(long actualVersion, Long expectedVersion) {
        if (expectedVersion == null || actualVersion != expectedVersion) {
            throw DocumentFailures.conflict("VERSION_CONFLICT", "Optimistic lock version conflict");
        }
    }

    private void requireActiveDocumentLink(UUID documentId, DocumentTargetContext targetContext) {
        boolean exists = linkRepository.existsActiveDocumentTargetLink(
                documentId,
                targetContext.targetType(),
                targetContext.targetId(),
                DocumentLifecycleStatus.ACTIVE,
                DocumentLifecycleStatus.DELETED
        );
        if (!exists) {
            throw DocumentFailures.conflict("DOCUMENT_LINK_NOT_FOUND", "Document is not actively linked to the requested target context");
        }
    }

    private void assertTargetMatchesRevision(RevisionExecutionContext context, DocumentTargetContext targetContext) {
        if (context.domain() != targetContext.revisionDomain()) {
            throw DocumentFailures.invalid("TARGET_DOMAIN_MISMATCH", "Document target domain does not match the revision domain");
        }
        if (context.domain() == RevisionDomain.LOCAL && !Objects.equals(context.organizationId(), targetContext.organizationId())) {
            throw DocumentFailures.invalid("LOCAL_ORGANIZATION_MISMATCH", "Document target organization does not match the revision organization");
        }
    }

    private void applyDocumentLifecycle(DocumentEntity document, LifecycleAction action, UUID actorId, Instant now) {
        switch (action) {
            case ACTIVATE -> document.activate(actorId, now);
            case INACTIVATE -> document.inactivate(actorId, now);
            case DELETE -> document.delete(actorId, now);
            case RESTORE -> document.restore(actorId, now);
        }
    }

    private void applyLinkLifecycle(DocumentLinkEntity link, LifecycleAction action, UUID actorId, Instant now) {
        switch (action) {
            case ACTIVATE -> link.activate(actorId, now);
            case INACTIVATE -> link.inactivate(actorId, now);
            case DELETE -> link.delete(actorId, now);
            case RESTORE -> link.restore(actorId, now);
        }
    }

    private RevisionOperationType operationType(LifecycleAction action) {
        return switch (action) {
            case ACTIVATE -> RevisionOperationType.ACTIVATE;
            case INACTIVATE -> RevisionOperationType.INACTIVATE;
            case DELETE -> RevisionOperationType.DELETE;
            case RESTORE -> RevisionOperationType.RESTORE;
        };
    }

    private RevisionContentResult completed(
            RevisionEntityType entityType,
            UUID entityId,
            RevisionOperationType operationType,
            Long expectedVersion,
            JsonNode beforeSnapshot,
            JsonNode afterSnapshot,
            Long appliedEntityVersion,
            JsonNode validationResult
    ) {
        return RevisionContentResult.completed(
                entityType,
                entityId,
                operationType,
                expectedVersion,
                beforeSnapshot,
                afterSnapshot,
                appliedEntityVersion,
                validationResult
        );
    }

    private ObjectNode documentSnapshot(DocumentEntity document) {
        ObjectNode node = objectMapper.createObjectNode();
        putUuid(node, "id", document.getId());
        putText(node, "code", document.getCode());
        putText(node, "title", document.getTitle());
        putText(node, "description", document.getDescription());
        putText(node, "documentCategoryCode", document.getDocumentCategoryCode());
        putText(node, "status", document.getStatus().wireValue());
        putLocalDate(node, "validFrom", document.getValidFrom());
        putLocalDate(node, "validTo", document.getValidTo());
        putInstant(node, "createdAt", document.getCreatedAt());
        putInstant(node, "updatedAt", document.getUpdatedAt());
        putUuid(node, "createdBy", document.getCreatedBy());
        putUuid(node, "updatedBy", document.getUpdatedBy());
        putInstant(node, "deletedAt", document.getDeletedAt());
        putUuid(node, "deletedBy", document.getDeletedBy());
        node.put("version", document.getVersion());
        return node;
    }

    private ObjectNode versionSnapshot(DocumentVersionEntity version) {
        ObjectNode node = objectMapper.createObjectNode();
        putUuid(node, "id", version.getId());
        putUuid(node, "documentId", version.getDocumentId());
        node.put("documentVersionNumber", version.getDocumentVersionNumber());
        putText(node, "fileName", version.getFileName());
        putText(node, "mimeType", version.getMimeType());
        node.put("fileSize", version.getFileSize());
        putText(node, "storageObjectKey", version.getStorageObjectKey());
        putText(node, "checksumAlgorithm", version.getChecksumAlgorithm());
        putText(node, "checksumValue", version.getChecksumValue());
        putText(node, "status", version.getStatus().wireValue());
        putLocalDate(node, "validFrom", version.getValidFrom());
        putLocalDate(node, "validTo", version.getValidTo());
        putInstant(node, "createdAt", version.getCreatedAt());
        putInstant(node, "updatedAt", version.getUpdatedAt());
        putUuid(node, "createdBy", version.getCreatedBy());
        putUuid(node, "updatedBy", version.getUpdatedBy());
        putInstant(node, "deletedAt", version.getDeletedAt());
        putUuid(node, "deletedBy", version.getDeletedBy());
        node.put("version", version.getVersion());
        return node;
    }

    private ObjectNode linkSnapshot(DocumentLinkEntity link) {
        ObjectNode node = objectMapper.createObjectNode();
        putUuid(node, "id", link.getId());
        putUuid(node, "documentVersionId", link.getDocumentVersionId());
        putText(node, "targetType", link.getTargetType().wireValue());
        putUuid(node, "targetId", link.getTargetId());
        putText(node, "status", link.getStatus().wireValue());
        putInstant(node, "createdAt", link.getCreatedAt());
        putInstant(node, "updatedAt", link.getUpdatedAt());
        putUuid(node, "createdBy", link.getCreatedBy());
        putUuid(node, "updatedBy", link.getUpdatedBy());
        putInstant(node, "deletedAt", link.getDeletedAt());
        putUuid(node, "deletedBy", link.getDeletedBy());
        node.put("version", link.getVersion());
        return node;
    }

    private ObjectNode validationSnapshot(DocumentTargetContext targetContext) {
        ObjectNode node = objectMapper.createObjectNode();
        putText(node, "targetType", targetContext.targetType().wireValue());
        putUuid(node, "targetId", targetContext.targetId());
        putText(node, "revisionDomain", targetContext.revisionDomain().name());
        putUuid(node, "organizationId", targetContext.organizationId());
        return node;
    }

    private void putText(ObjectNode node, String field, String value) {
        if (value == null) {
            node.putNull(field);
        } else {
            node.put(field, value);
        }
    }

    private void putUuid(ObjectNode node, String field, UUID value) {
        if (value == null) {
            node.putNull(field);
        } else {
            node.put(field, value.toString());
        }
    }

    private void putInstant(ObjectNode node, String field, Instant value) {
        if (value == null) {
            node.putNull(field);
        } else {
            node.put(field, value.toString());
        }
    }

    private void putLocalDate(ObjectNode node, String field, LocalDate value) {
        if (value == null) {
            node.putNull(field);
        } else {
            node.put(field, value.toString());
        }
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record PromotedUpload(DocumentTempUploadEntity tempUpload, String permanentObjectKey) {
    }
}
