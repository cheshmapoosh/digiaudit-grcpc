package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentMetadataDraftRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentLinkSummaryResponse;
import com.digiaudit.grcpc.modules.document.api.dto.NewDocumentDraftRequest;
import com.digiaudit.grcpc.modules.document.api.dto.NewDocumentVersionDraftRequest;
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
import com.digiaudit.grcpc.modules.securityacl.application.ResourceAuthorizationService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class DocumentCommandService {
    private static final String UPLOAD_PERMISSION = "DOCUMENT_UPLOAD";
    private static final String DELETE_PERMISSION = "DOCUMENT_DELETE";

    private final InternalDocumentJpaRepository documentRepository;
    private final InternalDocumentVersionJpaRepository versionRepository;
    private final InternalDocumentLinkJpaRepository linkRepository;
    private final InternalDocumentTempUploadJpaRepository tempUploadRepository;
    private final DocumentTargetContextResolver targetContextResolver;
    private final ResourceAuthorizationService authorizationService;
    private final CurrentUserProvider currentUserProvider;
    private final DocumentStoragePort storagePort;
    private final DocumentObjectKeyService objectKeyService;
    private final DocumentPromotionRollbackRegistry cleanupRegistry;
    private final DocumentValidation validation;
    private final DocumentResponseMapper responseMapper;
    private final Clock clock;

    public DocumentCommandService(
            InternalDocumentJpaRepository documentRepository,
            InternalDocumentVersionJpaRepository versionRepository,
            InternalDocumentLinkJpaRepository linkRepository,
            InternalDocumentTempUploadJpaRepository tempUploadRepository,
            DocumentTargetContextResolver targetContextResolver,
            ResourceAuthorizationService authorizationService,
            CurrentUserProvider currentUserProvider,
            DocumentStoragePort storagePort,
            DocumentObjectKeyService objectKeyService,
            DocumentPromotionRollbackRegistry cleanupRegistry,
            DocumentValidation validation,
            DocumentResponseMapper responseMapper,
            @Qualifier("documentClock") Clock clock
    ) {
        this.documentRepository = Objects.requireNonNull(documentRepository, "documentRepository is required");
        this.versionRepository = Objects.requireNonNull(versionRepository, "versionRepository is required");
        this.linkRepository = Objects.requireNonNull(linkRepository, "linkRepository is required");
        this.tempUploadRepository = Objects.requireNonNull(tempUploadRepository, "tempUploadRepository is required");
        this.targetContextResolver = Objects.requireNonNull(targetContextResolver, "targetContextResolver is required");
        this.authorizationService = Objects.requireNonNull(authorizationService, "authorizationService is required");
        this.currentUserProvider = Objects.requireNonNull(currentUserProvider, "currentUserProvider is required");
        this.storagePort = Objects.requireNonNull(storagePort, "storagePort is required");
        this.objectKeyService = Objects.requireNonNull(objectKeyService, "objectKeyService is required");
        this.cleanupRegistry = Objects.requireNonNull(cleanupRegistry, "cleanupRegistry is required");
        this.validation = Objects.requireNonNull(validation, "validation is required");
        this.responseMapper = Objects.requireNonNull(responseMapper, "responseMapper is required");
        this.clock = Objects.requireNonNull(clock, "clock is required");
    }

    @Transactional
    public void preflightTemporaryUploads(DocumentAggregateBatchRequest requestedBatch) {
        DocumentAggregateBatchRequest batch = requestedBatch == null
                ? new DocumentAggregateBatchRequest(null, null, null)
                : requestedBatch;
        Set<UUID> tempUploadIds = new HashSet<>();
        for (NewDocumentDraftRequest draft : batch.newDocuments()) {
            requireUniqueTempUpload(tempUploadIds, draft.tempUploadId());
            validation.validateDateRange(draft.validFrom(), draft.validTo());
            validation.requiredText(draft.title(), 255, "INVALID_DOCUMENT_TITLE", "Document title");
            validation.nullableText(draft.code(), 64, "INVALID_DOCUMENT_CODE", "Document code");
        }
        for (NewDocumentVersionDraftRequest draft : batch.newVersions()) {
            requireUniqueTempUpload(tempUploadIds, draft.tempUploadId());
            validation.requireExpectedVersion(draft.expectedDocumentVersion());
            validation.validateDateRange(draft.validFrom(), draft.validTo());
        }

        UUID actorId = actorId();
        Instant now = Instant.now(clock);
        tempUploadIds.stream().sorted().forEach(tempUploadId ->
                preflightTemporaryUpload(tempUploadId, actorId, now)
        );
    }

    @Transactional
    public List<DocumentCommandResponse> finalizeAggregate(
            DocumentAggregateBatchRequest requestedBatch,
            DocumentLinkTargetType targetType,
            UUID targetId
    ) {
        DocumentAggregateBatchRequest batch = requestedBatch == null
                ? DocumentAggregateBatchRequest.empty()
                : requestedBatch;
        if (batch.newDocuments().isEmpty()
                && batch.newVersions().isEmpty()
                && batch.metadataUpdates().isEmpty()) {
            return List.of();
        }

        DocumentTargetContext targetContext = resolveAndAuthorize(targetType, targetId, UPLOAD_PERMISSION);
        UUID actorId = actorId();
        Instant now = Instant.now(clock);
        preflightAggregate(batch, targetContext, actorId, now);

        List<DocumentCommandResponse> results = new ArrayList<>();
        for (NewDocumentDraftRequest draft : batch.newDocuments()) {
            results.add(createLinkedDocument(new CreateLinkedDocument(
                    draft.tempUploadId(),
                    draft.code(),
                    draft.title(),
                    draft.description(),
                    null,
                    targetContext.targetType(),
                    targetContext.targetId(),
                    draft.validFrom(),
                    draft.validTo()
            )));
        }
        for (NewDocumentVersionDraftRequest draft : batch.newVersions()) {
            results.add(addVersion(new AddVersion(
                    draft.documentId(),
                    draft.tempUploadId(),
                    draft.expectedDocumentVersion(),
                    targetContext.targetType(),
                    targetContext.targetId(),
                    draft.validFrom(),
                    draft.validTo()
            )));
        }
        for (DocumentMetadataDraftRequest draft : batch.metadataUpdates()) {
            results.add(updateMetadata(new UpdateMetadata(
                    draft.documentId(),
                    draft.expectedVersion(),
                    targetContext.targetType(),
                    targetContext.targetId(),
                    PatchValue.absent(),
                    PatchValue.present(draft.title()),
                    PatchValue.absent(),
                    PatchValue.absent(),
                    PatchValue.absent(),
                    PatchValue.absent()
            )));
        }
        return List.copyOf(results);
    }

    private void preflightAggregate(
            DocumentAggregateBatchRequest batch,
            DocumentTargetContext targetContext,
            UUID actorId,
            Instant now
    ) {
        Set<UUID> tempUploadIds = new HashSet<>();
        Set<UUID> mutatedDocumentIds = new HashSet<>();

        for (NewDocumentDraftRequest draft : batch.newDocuments()) {
            requireUniqueTempUpload(tempUploadIds, draft.tempUploadId());
            validation.validateDateRange(draft.validFrom(), draft.validTo());
            validation.requiredText(draft.title(), 255, "INVALID_DOCUMENT_TITLE", "Document title");
            validation.nullableText(draft.code(), 64, "INVALID_DOCUMENT_CODE", "Document code");
        }
        for (NewDocumentVersionDraftRequest draft : batch.newVersions()) {
            requireUniqueTempUpload(tempUploadIds, draft.tempUploadId());
            requireUniqueDocumentMutation(mutatedDocumentIds, draft.documentId());
            validation.requireExpectedVersion(draft.expectedDocumentVersion());
            validation.validateDateRange(draft.validFrom(), draft.validTo());
        }
        for (DocumentMetadataDraftRequest draft : batch.metadataUpdates()) {
            requireUniqueDocumentMutation(mutatedDocumentIds, draft.documentId());
            validation.requireExpectedVersion(draft.expectedVersion());
            validation.requiredText(draft.title(), 255, "INVALID_DOCUMENT_TITLE", "Document title");
        }

        tempUploadIds.stream().sorted().forEach(tempUploadId ->
                preflightTemporaryUpload(tempUploadId, actorId, now)
        );
        mutatedDocumentIds.stream().sorted().forEach(documentId -> {
            DocumentEntity document = lockDocument(documentId);
            Long expectedVersion = batch.newVersions().stream()
                    .filter(draft -> draft.documentId().equals(documentId))
                    .map(NewDocumentVersionDraftRequest::expectedDocumentVersion)
                    .findFirst()
                    .orElseGet(() -> batch.metadataUpdates().stream()
                            .filter(draft -> draft.documentId().equals(documentId))
                            .map(DocumentMetadataDraftRequest::expectedVersion)
                            .findFirst()
                            .orElse(null));
            requireVersion(document.getVersion(), expectedVersion);
            document.requireNotDeleted();
            requireActiveDocumentLink(document.getId(), targetContext);
        });
    }

    private void preflightTemporaryUpload(UUID tempUploadId, UUID actorId, Instant now) {
        DocumentTempUploadEntity tempUpload = tempUploadRepository.lockById(tempUploadId)
                .orElseThrow(() -> DocumentFailures.notFound(
                        "TEMPORARY_UPLOAD_NOT_FOUND",
                        "Temporary upload was not found. tempUploadId=" + tempUploadId
                ));
        validateTemporaryUpload(tempUpload, actorId, now);
        verifyTemporaryObject(tempUpload);
    }

    private void requireUniqueTempUpload(Set<UUID> seen, UUID tempUploadId) {
        if (tempUploadId == null || !seen.add(tempUploadId)) {
            throw DocumentFailures.invalid("DUPLICATE_TEMP_UPLOAD", "A temporary upload may be used only once per save");
        }
    }

    private void requireUniqueDocumentMutation(Set<UUID> seen, UUID documentId) {
        if (documentId == null || !seen.add(documentId)) {
            throw DocumentFailures.invalid("DUPLICATE_DOCUMENT_OPERATION", "Conflicting operations for the same document are not allowed in one save");
        }
    }

    @Transactional
    public DocumentCommandResponse createLinkedDocument(CreateLinkedDocument command) {
        DocumentTargetContext targetContext = resolveAndAuthorize(command.targetType(), command.targetId(), UPLOAD_PERMISSION);
        UUID actorId = actorId();
        Instant now = Instant.now(clock);
        validation.validateDateRange(command.validFrom(), command.validTo());
        String title = validation.requiredText(command.title(), 255, "INVALID_DOCUMENT_TITLE", "Document title");
        String code = validation.nullableText(command.code(), 64, "INVALID_DOCUMENT_CODE", "Document code");
        String category = validation.nullableText(command.documentCategoryCode(), 64, "INVALID_DOCUMENT_CATEGORY", "Document category");

        UUID documentId = UUID.randomUUID();
        UUID documentVersionId = UUID.randomUUID();
        UUID documentLinkId = UUID.randomUUID();
        PromotedUpload promotedUpload = lockValidateAndPromote(command.tempUploadId(), actorId, now, documentVersionId);
        DocumentTempUploadEntity tempUpload = promotedUpload.tempUpload();

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
        DocumentVersionEntity version = DocumentVersionEntity.create(
                documentVersionId,
                documentId,
                1L,
                tempUpload.getOriginalFileName(),
                tempUpload.getMimeType(),
                tempUpload.getFileSize(),
                promotedUpload.permanentObjectKey(),
                tempUpload.getChecksumAlgorithm(),
                tempUpload.getChecksumValue(),
                command.validFrom(),
                command.validTo(),
                actorId,
                now
        );
        DocumentLinkEntity link = DocumentLinkEntity.create(
                documentLinkId,
                documentVersionId,
                targetContext.targetType(),
                targetContext.targetId(),
                actorId,
                now
        );

        documentRepository.save(document);
        versionRepository.save(version);
        linkRepository.save(link);
        documentRepository.flush();
        tempUploadRepository.delete(tempUpload);
        tempUploadRepository.flush();

        DocumentLinkSummaryResponse summary = responseMapper.toLinkSummary(document, version, link);
        return responseMapper.toCommandResponse(document.getId(), document, version, link, summary);
    }

    @Transactional
    public DocumentCommandResponse addVersion(AddVersion command) {
        DocumentTargetContext targetContext = resolveAndAuthorize(command.targetType(), command.targetId(), UPLOAD_PERMISSION);
        UUID actorId = actorId();
        validation.requireExpectedVersion(command.expectedDocumentVersion());
        validation.validateDateRange(command.validFrom(), command.validTo());
        Instant now = Instant.now(clock);
        DocumentEntity document = lockDocument(command.documentId());
        requireVersion(document.getVersion(), command.expectedDocumentVersion());
        document.requireNotDeleted();

        UUID documentVersionId = UUID.randomUUID();
        UUID documentLinkId = UUID.randomUUID();
        long nextVersionNumber = versionRepository.maxVersionNumberForLockedDocument(document.getId()) + 1L;
        PromotedUpload promotedUpload = lockValidateAndPromote(command.tempUploadId(), actorId, now, documentVersionId);
        DocumentTempUploadEntity tempUpload = promotedUpload.tempUpload();

        document.touch(actorId, now);
        DocumentVersionEntity version = DocumentVersionEntity.create(
                documentVersionId,
                document.getId(),
                nextVersionNumber,
                tempUpload.getOriginalFileName(),
                tempUpload.getMimeType(),
                tempUpload.getFileSize(),
                promotedUpload.permanentObjectKey(),
                tempUpload.getChecksumAlgorithm(),
                tempUpload.getChecksumValue(),
                command.validFrom(),
                command.validTo(),
                actorId,
                now
        );
        DocumentLinkEntity link = DocumentLinkEntity.create(
                documentLinkId,
                version.getId(),
                targetContext.targetType(),
                targetContext.targetId(),
                actorId,
                now
        );

        documentRepository.save(document);
        versionRepository.save(version);
        linkRepository.save(link);
        documentRepository.flush();
        tempUploadRepository.delete(tempUpload);
        tempUploadRepository.flush();

        DocumentLinkSummaryResponse summary = responseMapper.toLinkSummary(document, version, link);
        return responseMapper.toCommandResponse(document.getId(), document, version, link, summary);
    }

    @Transactional
    public DocumentCommandResponse updateMetadata(UpdateMetadata command) {
        DocumentTargetContext targetContext = resolveAndAuthorize(command.targetType(), command.targetId(), UPLOAD_PERMISSION);
        UUID actorId = actorId();
        validation.requireExpectedVersion(command.expectedVersion());
        Instant now = Instant.now(clock);
        DocumentEntity document = lockDocument(command.documentId());
        requireVersion(document.getVersion(), command.expectedVersion());
        LinkedDocumentContext linkedContext = requireActiveDocumentLink(document.getId(), targetContext);
        String nextCode = command.code().isPresent()
                ? validation.nullableText(command.code().value(), 64, "INVALID_DOCUMENT_CODE", "Document code")
                : document.getCode();
        String nextTitle = command.title().isPresent()
                ? validation.requiredText(command.title().value(), 255, "INVALID_DOCUMENT_TITLE", "Document title")
                : document.getTitle();
        String nextDescription = command.description().isPresent()
                ? normalizeText(command.description().value())
                : document.getDescription();
        String nextCategory = command.documentCategoryCode().isPresent()
                ? validation.nullableText(command.documentCategoryCode().value(), 64, "INVALID_DOCUMENT_CATEGORY", "Document category")
                : document.getDocumentCategoryCode();
        LocalDate nextValidFrom = command.validFrom().isPresent() ? command.validFrom().value() : document.getValidFrom();
        LocalDate nextValidTo = command.validTo().isPresent() ? command.validTo().value() : document.getValidTo();
        validation.validateDateRange(nextValidFrom, nextValidTo);
        document.updateMetadata(
                nextCode,
                nextTitle,
                nextDescription,
                nextCategory,
                nextValidFrom,
                nextValidTo,
                actorId,
                now
        );
        documentRepository.saveAndFlush(document);

        DocumentLinkSummaryResponse summary = responseMapper.toLinkSummary(document, linkedContext.version(), linkedContext.link());
        return responseMapper.toCommandResponse(document.getId(), document, linkedContext.version(), linkedContext.link(), summary);
    }

    @Transactional
    public DocumentCommandResponse documentLifecycle(DocumentLifecycle command) {
        String permission = command.action() == LifecycleAction.DELETE ? DELETE_PERMISSION : UPLOAD_PERMISSION;
        DocumentTargetContext targetContext = resolveAndAuthorize(command.targetType(), command.targetId(), permission);
        UUID actorId = actorId();
        validation.requireExpectedVersion(command.expectedVersion());
        Instant now = Instant.now(clock);
        DocumentEntity document = lockDocument(command.documentId());
        requireVersion(document.getVersion(), command.expectedVersion());
        LinkedDocumentContext linkedContext = requireActiveDocumentLink(document.getId(), targetContext);
        applyDocumentLifecycle(document, command.action(), actorId, now);
        documentRepository.saveAndFlush(document);

        DocumentLinkSummaryResponse summary = responseMapper.toLinkSummary(document, linkedContext.version(), linkedContext.link());
        return responseMapper.toCommandResponse(document.getId(), document, linkedContext.version(), linkedContext.link(), summary);
    }

    @Transactional
    public DocumentCommandResponse linkExistingVersion(LinkExistingVersion command) {
        DocumentTargetContext targetContext = resolveAndAuthorize(command.targetType(), command.targetId(), UPLOAD_PERMISSION);
        UUID actorId = actorId();
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
        if (link == null) {
            link = DocumentLinkEntity.create(UUID.randomUUID(), version.getId(), targetContext.targetType(), targetContext.targetId(), actorId, now);
        } else if (link.getStatus() == DocumentLifecycleStatus.ACTIVE) {
            throw DocumentFailures.conflict("DUPLICATE_ACTIVE_DOCUMENT_LINK", "An active document link already exists for this version and target");
        } else {
            link.restore(actorId, now);
        }
        linkRepository.saveAndFlush(link);

        DocumentLinkSummaryResponse summary = responseMapper.toLinkSummary(document, version, link);
        return responseMapper.toCommandResponse(link.getId(), document, version, link, summary);
    }

    @Transactional
    public DocumentCommandResponse linkLifecycle(LinkLifecycle command) {
        UUID actorId = actorId();
        validation.requireExpectedVersion(command.expectedVersion());
        Instant now = Instant.now(clock);
        DocumentLinkEntity link = linkRepository.lockById(command.linkId())
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_LINK_NOT_FOUND", "Document link was not found"));
        if (!link.getTargetType().isPublicSelectable()) {
            throw DocumentFailures.invalid("TARGET_NOT_ALLOWED", "Document link target type is not allowed from browser requests");
        }
        String permission = command.action() == LifecycleAction.DELETE ? DELETE_PERMISSION : UPLOAD_PERMISSION;
        resolveAndAuthorize(link.getTargetType(), link.getTargetId(), permission);
        requireVersion(link.getVersion(), command.expectedVersion());
        DocumentVersionEntity version = versionRepository.findById(link.getDocumentVersionId())
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_VERSION_NOT_FOUND", "Document version was not found"));
        DocumentEntity document = documentRepository.findById(version.getDocumentId())
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_NOT_FOUND", "Document was not found"));
        applyLinkLifecycle(link, command.action(), actorId, now);
        linkRepository.saveAndFlush(link);

        DocumentLinkSummaryResponse summary = responseMapper.toLinkSummary(document, version, link);
        return responseMapper.toCommandResponse(link.getId(), document, version, link, summary);
    }

    private DocumentTargetContext resolveAndAuthorize(DocumentLinkTargetType targetType, UUID targetId, String permission) {
        DocumentTargetContext targetContext = targetContextResolver.resolvePublic(targetType, targetId);
        authorizationService.assertCanAccess(
                targetContext.authorizationResourceType(),
                targetContext.authorizationResourceId(),
                permission
        );
        return targetContext;
    }

    private UUID actorId() {
        return currentUserProvider.getCurrentUserIdOptional()
                .orElseThrow(() -> DocumentFailures.forbidden("DOCUMENT_ACTOR_REQUIRED", "Authenticated user is required"));
    }

    private PromotedUpload lockValidateAndPromote(UUID tempUploadId, UUID actorId, Instant now, UUID documentVersionId) {
        DocumentTempUploadEntity tempUpload = tempUploadRepository.lockById(tempUploadId)
                .orElseThrow(() -> DocumentFailures.notFound(
                        "TEMPORARY_UPLOAD_NOT_FOUND",
                        "Temporary upload was not found. tempUploadId=" + tempUploadId
                ));
        validateTemporaryUpload(tempUpload, actorId, now);
        DocumentStoragePort.DocumentObjectMetadata expectedMetadata = verifyTemporaryObject(tempUpload);
        String permanentObjectKey = objectKeyService.permanentKey(tempUpload.getId(), tempUpload.getOriginalFileName());
        try {
            DocumentStoragePort.PermanentObjectPromotionResult promotion = storagePort.promoteTemporaryObject(
                    tempUpload.getStorageObjectKey(),
                    permanentObjectKey,
                    expectedMetadata
            );
            cleanupRegistry.registerFinalizationCleanup(
                    tempUpload.getStorageObjectKey(),
                    promotion.permanentObjectKey(),
                    tempUpload.getId(),
                    documentVersionId,
                    promotion.createdByThisAttempt()
            );
            return new PromotedUpload(tempUpload, promotion.permanentObjectKey());
        } catch (DocumentStorageException ex) {
            throw storageFailure(ex, tempUploadId);
        }
    }

    private void validateTemporaryUpload(DocumentTempUploadEntity tempUpload, UUID actorId, Instant now) {
        if (!tempUpload.getUploadedBy().equals(actorId)) {
            throw DocumentFailures.forbidden(
                    "TEMPORARY_UPLOAD_OWNERSHIP_DENIED",
                    "Temporary upload is owned by another user. tempUploadId=" + tempUpload.getId()
            );
        }
        if (!now.isBefore(tempUpload.getExpiresAt())) {
            throw DocumentFailures.gone(
                    "TEMPORARY_UPLOAD_EXPIRED",
                    "Temporary upload has expired. tempUploadId=" + tempUpload.getId()
            );
        }
    }

    private DocumentStoragePort.DocumentObjectMetadata verifyTemporaryObject(DocumentTempUploadEntity tempUpload) {
        try {
            DocumentStoragePort.DocumentObjectMetadata actual = storagePort.inspectObject(tempUpload.getStorageObjectKey());
            if (actual.fileSize() != tempUpload.getFileSize()
                    || !Objects.equals(actual.mimeType(), tempUpload.getMimeType())) {
                throw new DocumentStorageException("TEMPORARY_OBJECT_METADATA_MISMATCH", "Temporary upload metadata mismatch");
            }
            String checksum = storagePort.calculateObjectChecksum(
                    tempUpload.getStorageObjectKey(),
                    tempUpload.getChecksumAlgorithm()
            );
            if (!Objects.equals(checksum, tempUpload.getChecksumValue())) {
                throw new DocumentStorageException("TEMPORARY_OBJECT_METADATA_MISMATCH", "Temporary upload metadata mismatch");
            }
            return new DocumentStoragePort.DocumentObjectMetadata(
                    tempUpload.getMimeType(),
                    tempUpload.getFileSize(),
                    tempUpload.getChecksumAlgorithm(),
                    tempUpload.getChecksumValue()
            );
        } catch (DocumentStorageException ex) {
            throw storageFailure(ex, tempUpload.getId());
        }
    }

    private RuntimeException storageFailure(DocumentStorageException ex, UUID tempUploadId) {
        RuntimeException failure = DocumentTemporaryUploadService.storageFailure(ex);
        if (failure instanceof ConflictException conflict) {
            return new ConflictException(
                    conflict.getErrorCode(),
                    conflict.getMessageCode(),
                    conflict.getDeveloperMessage() + ". tempUploadId=" + tempUploadId,
                    conflict.getMessageArgs()
            );
        }
        return failure;
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

    private LinkedDocumentContext requireActiveDocumentLink(UUID documentId, DocumentTargetContext targetContext) {
        List<DocumentLinkEntity> links = linkRepository.findActiveTargetLinksForDocument(
                documentId,
                targetContext.targetType(),
                targetContext.targetId(),
                DocumentLifecycleStatus.ACTIVE,
                DocumentLifecycleStatus.DELETED
        );
        if (links.isEmpty()) {
            throw DocumentFailures.conflict("DOCUMENT_LINK_NOT_FOUND", "Document is not actively linked to the requested target context");
        }
        DocumentLinkEntity link = links.get(0);
        DocumentVersionEntity version = versionRepository.findById(link.getDocumentVersionId())
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_VERSION_NOT_FOUND", "Document version was not found"));
        return new LinkedDocumentContext(version, link);
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

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record PromotedUpload(DocumentTempUploadEntity tempUpload, String permanentObjectKey) {
    }

    private record LinkedDocumentContext(DocumentVersionEntity version, DocumentLinkEntity link) {
    }
}
