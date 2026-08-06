package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.common.exception.BusinessException;
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
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
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
                ? DocumentAggregateBatchRequest.empty()
                : requestedBatch;
        AggregateDraftPlan plan = planAggregateDrafts(batch);
        UUID actorId = actorId();
        Instant now = Instant.now(clock);
        plan.tempUploadContexts().entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> preflightTemporaryUpload(entry.getKey(), actorId, now, entry.getValue()));
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
        AggregateDraftPlan plan = planAggregateDrafts(batch);
        PreparedAggregate prepared = preflightAggregate(plan, targetContext, actorId, now);

        List<DocumentCommandResponse> results = new ArrayList<>();
        for (NewDocumentDraftRequest draft : batch.newDocuments()) {
            results.add(finalizeNewDocumentDraft(
                    draft,
                    prepared.tempUploads().get(draft.tempUploadId()),
                    targetContext,
                    actorId,
                    now
            ));
        }
        for (PreparedExistingMutation mutation : prepared.existingMutations()) {
            results.add(finalizeExistingDocumentMutation(mutation, prepared.tempUploads(), targetContext, actorId, now));
        }
        return List.copyOf(results);
    }

    private PreparedAggregate preflightAggregate(
            AggregateDraftPlan plan,
            DocumentTargetContext targetContext,
            UUID actorId,
            Instant now
    ) {
        Map<UUID, DocumentTempUploadEntity> tempUploads = new LinkedHashMap<>();
        plan.tempUploadContexts().entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> tempUploads.put(
                        entry.getKey(),
                        preflightTemporaryUpload(entry.getKey(), actorId, now, entry.getValue())
                ));

        List<PreparedExistingMutation> existingMutations = new ArrayList<>();
        for (ExistingDocumentDraft mutation : plan.existingDrafts().entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(Map.Entry::getValue)
                .toList()) {
            DraftContext context = mutation.primaryContext();
            try {
                DocumentEntity document = lockDocument(mutation.documentId());
                requireVersion(document.getVersion(), mutation.expectedVersion());
                document.requireNotDeleted();
                LinkedDocumentContext linkedContext = requireActiveDocumentLink(document.getId(), targetContext);
                existingMutations.add(new PreparedExistingMutation(
                        document,
                        linkedContext,
                        mutation.newVersion(),
                        mutation.metadataUpdate(),
                        context
                ));
            } catch (BusinessException ex) {
                throw withDraftContext(ex, context);
            }
        }
        return new PreparedAggregate(Map.copyOf(tempUploads), List.copyOf(existingMutations));
    }

    private DocumentTempUploadEntity preflightTemporaryUpload(
            UUID tempUploadId,
            UUID actorId,
            Instant now,
            DraftContext context
    ) {
        try {
            DocumentTempUploadEntity tempUpload = tempUploadRepository.lockById(tempUploadId)
                    .orElseThrow(() -> DocumentFailures.notFound(
                            "TEMPORARY_UPLOAD_NOT_FOUND",
                            "Temporary upload was not found"
                    ));
            validateTemporaryUpload(tempUpload, actorId, now);
            verifyTemporaryObject(tempUpload);
            return tempUpload;
        } catch (BusinessException ex) {
            throw withDraftContext(ex, context);
        }
    }

    private AggregateDraftPlan planAggregateDrafts(DocumentAggregateBatchRequest batch) {
        Map<UUID, DraftContext> tempUploadContexts = new LinkedHashMap<>();
        Map<UUID, ExistingDocumentDraft> existingDrafts = new TreeMap<>();

        for (NewDocumentDraftRequest draft : batch.newDocuments()) {
            DraftContext context = new DraftContext(draft == null ? null : draft.tempUploadId(), null, "NEW_DOCUMENT");
            if (draft == null) {
                throw withDraftContext(DocumentFailures.invalid("INVALID_DOCUMENT_DRAFT", "New document draft is required"), context);
            }
            validateWithDraftContext(context, () -> {
                validation.validateDateRange(draft.validFrom(), draft.validTo());
                validation.requiredText(draft.title(), 255, "INVALID_DOCUMENT_TITLE", "Document title");
                validation.nullableText(draft.code(), 64, "INVALID_DOCUMENT_CODE", "Document code");
            });
            registerTempUpload(tempUploadContexts, draft.tempUploadId(), context);
        }

        for (NewDocumentVersionDraftRequest draft : batch.newVersions()) {
            DraftContext context = new DraftContext(
                    draft == null ? null : draft.tempUploadId(),
                    draft == null ? null : draft.documentId(),
                    "NEW_VERSION"
            );
            if (draft == null) {
                throw withDraftContext(DocumentFailures.invalid("INVALID_DOCUMENT_DRAFT", "New document version draft is required"), context);
            }
            validateWithDraftContext(context, () -> {
                validation.requireExpectedVersion(draft.expectedDocumentVersion());
                validation.validateDateRange(draft.validFrom(), draft.validTo());
            });
            ExistingDocumentDraft existing = existingDrafts.computeIfAbsent(
                    requiredDocumentId(draft.documentId(), context),
                    ExistingDocumentDraft::new
            );
            if (existing.newVersion() != null) {
                throw withDraftContext(DocumentFailures.invalid(
                        "DUPLICATE_DOCUMENT_VERSION_DRAFT",
                        "Only one new-version draft is allowed for a document in one save"
                ), context);
            }
            existing.setNewVersion(draft);
            registerTempUpload(tempUploadContexts, draft.tempUploadId(), context);
        }

        for (DocumentMetadataDraftRequest draft : batch.metadataUpdates()) {
            DraftContext context = new DraftContext(
                    null,
                    draft == null ? null : draft.documentId(),
                    "METADATA_UPDATE"
            );
            if (draft == null) {
                throw withDraftContext(DocumentFailures.invalid("INVALID_DOCUMENT_DRAFT", "Document metadata draft is required"), context);
            }
            validateWithDraftContext(context, () -> {
                validation.requireExpectedVersion(draft.expectedVersion());
                validation.requiredText(draft.title(), 255, "INVALID_DOCUMENT_TITLE", "Document title");
            });
            ExistingDocumentDraft existing = existingDrafts.computeIfAbsent(
                    requiredDocumentId(draft.documentId(), context),
                    ExistingDocumentDraft::new
            );
            if (existing.metadataUpdate() != null) {
                throw withDraftContext(DocumentFailures.invalid(
                        "DUPLICATE_DOCUMENT_OPERATION",
                        "Only one metadata update is allowed for a document in one save"
                ), context);
            }
            existing.setMetadataUpdate(draft);
        }

        for (ExistingDocumentDraft existing : existingDrafts.values()) {
            if (existing.newVersion() != null
                    && existing.metadataUpdate() != null
                    && !Objects.equals(
                            existing.newVersion().expectedDocumentVersion(),
                            existing.metadataUpdate().expectedVersion()
                    )) {
                throw withDraftContext(DocumentFailures.conflict(
                        "DOCUMENT_VERSION_CONFLICT",
                        "Document aggregate drafts do not share the same baseline version"
                ), existing.primaryContext());
            }
        }

        return new AggregateDraftPlan(Map.copyOf(tempUploadContexts), existingDrafts);
    }

    private void registerTempUpload(
            Map<UUID, DraftContext> contexts,
            UUID tempUploadId,
            DraftContext context
    ) {
        if (tempUploadId == null || contexts.putIfAbsent(tempUploadId, context) != null) {
            throw withDraftContext(DocumentFailures.invalid(
                    "DUPLICATE_TEMP_UPLOAD",
                    "A temporary upload may be used only once per save"
            ), context);
        }
    }

    private UUID requiredDocumentId(UUID documentId, DraftContext context) {
        if (documentId == null) {
            throw withDraftContext(DocumentFailures.invalid(
                    "INVALID_DOCUMENT_DRAFT",
                    "Document identifier is required"
            ), context);
        }
        return documentId;
    }

    private void validateWithDraftContext(DraftContext context, Runnable validationAction) {
        try {
            validationAction.run();
        } catch (BusinessException ex) {
            throw withDraftContext(ex, context);
        }
    }

    private DocumentCommandResponse finalizeNewDocumentDraft(
            NewDocumentDraftRequest draft,
            DocumentTempUploadEntity tempUpload,
            DocumentTargetContext targetContext,
            UUID actorId,
            Instant now
    ) {
        DraftContext context = new DraftContext(draft.tempUploadId(), null, "NEW_DOCUMENT");
        try {
            UUID documentId = UUID.randomUUID();
            UUID documentVersionId = UUID.randomUUID();
            UUID documentLinkId = UUID.randomUUID();
            PromotedUpload promotedUpload = promotePreparedUpload(tempUpload, documentVersionId);

            DocumentEntity document = DocumentEntity.create(
                    documentId,
                    validation.nullableText(draft.code(), 64, "INVALID_DOCUMENT_CODE", "Document code"),
                    validation.requiredText(draft.title(), 255, "INVALID_DOCUMENT_TITLE", "Document title"),
                    normalizeText(draft.description()),
                    null,
                    draft.validFrom(),
                    draft.validTo(),
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
                    draft.validFrom(),
                    draft.validTo(),
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
        } catch (BusinessException ex) {
            throw withDraftContext(ex, context);
        }
    }

    private DocumentCommandResponse finalizeExistingDocumentMutation(
            PreparedExistingMutation mutation,
            Map<UUID, DocumentTempUploadEntity> tempUploads,
            DocumentTargetContext targetContext,
            UUID actorId,
            Instant now
    ) {
        try {
            DocumentEntity document = mutation.document();
            DocumentVersionEntity responseVersion = mutation.linkedContext().version();
            DocumentLinkEntity responseLink = mutation.linkedContext().link();

            if (mutation.metadataUpdate() != null) {
                document.updateMetadata(
                        document.getCode(),
                        validation.requiredText(mutation.metadataUpdate().title(), 255, "INVALID_DOCUMENT_TITLE", "Document title"),
                        document.getDescription(),
                        document.getDocumentCategoryCode(),
                        document.getValidFrom(),
                        document.getValidTo(),
                        actorId,
                        now
                );
            }

            if (mutation.newVersion() != null) {
                NewDocumentVersionDraftRequest draft = mutation.newVersion();
                UUID documentVersionId = UUID.randomUUID();
                long nextVersionNumber = versionRepository.maxVersionNumberForLockedDocument(document.getId()) + 1L;
                DocumentTempUploadEntity tempUpload = tempUploads.get(draft.tempUploadId());
                PromotedUpload promotedUpload = promotePreparedUpload(tempUpload, documentVersionId);
                if (mutation.metadataUpdate() == null) {
                    document.touch(actorId, now);
                }
                responseVersion = DocumentVersionEntity.create(
                        documentVersionId,
                        document.getId(),
                        nextVersionNumber,
                        tempUpload.getOriginalFileName(),
                        tempUpload.getMimeType(),
                        tempUpload.getFileSize(),
                        promotedUpload.permanentObjectKey(),
                        tempUpload.getChecksumAlgorithm(),
                        tempUpload.getChecksumValue(),
                        draft.validFrom(),
                        draft.validTo(),
                        actorId,
                        now
                );
                responseLink = DocumentLinkEntity.create(
                        UUID.randomUUID(),
                        responseVersion.getId(),
                        targetContext.targetType(),
                        targetContext.targetId(),
                        actorId,
                        now
                );
                versionRepository.save(responseVersion);
                linkRepository.save(responseLink);
                tempUploadRepository.delete(tempUpload);
            }

            documentRepository.save(document);
            documentRepository.flush();
            if (mutation.newVersion() != null) {
                tempUploadRepository.flush();
            }

            DocumentLinkSummaryResponse summary = responseMapper.toLinkSummary(document, responseVersion, responseLink);
            return responseMapper.toCommandResponse(document.getId(), document, responseVersion, responseLink, summary);
        } catch (BusinessException ex) {
            throw withDraftContext(ex, mutation.context());
        }
    }

    private PromotedUpload promotePreparedUpload(DocumentTempUploadEntity tempUpload, UUID documentVersionId) {
        DocumentStoragePort.DocumentObjectMetadata expectedMetadata = new DocumentStoragePort.DocumentObjectMetadata(
                tempUpload.getMimeType(),
                tempUpload.getFileSize(),
                tempUpload.getChecksumAlgorithm(),
                tempUpload.getChecksumValue()
        );
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
            throw storageFailure(ex, tempUpload.getId());
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
                    conflict.getDeveloperMessage(),
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
            throw DocumentFailures.conflict("DOCUMENT_VERSION_CONFLICT", "Document optimistic lock version conflict");
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

    private <T extends BusinessException> T withDraftContext(T failure, DraftContext context) {
        if (context != null) {
            failure.putErrorContext("tempUploadId", context.tempUploadId());
            failure.putErrorContext("documentId", context.documentId());
            failure.putErrorContext("draftType", context.draftType());
        }
        return failure;
    }

    private record DraftContext(UUID tempUploadId, UUID documentId, String draftType) {
    }

    private record AggregateDraftPlan(
            Map<UUID, DraftContext> tempUploadContexts,
            Map<UUID, ExistingDocumentDraft> existingDrafts
    ) {
    }

    private record PreparedAggregate(
            Map<UUID, DocumentTempUploadEntity> tempUploads,
            List<PreparedExistingMutation> existingMutations
    ) {
    }

    private record PreparedExistingMutation(
            DocumentEntity document,
            LinkedDocumentContext linkedContext,
            NewDocumentVersionDraftRequest newVersion,
            DocumentMetadataDraftRequest metadataUpdate,
            DraftContext context
    ) {
    }

    private static final class ExistingDocumentDraft {
        private final UUID documentId;
        private NewDocumentVersionDraftRequest newVersion;
        private DocumentMetadataDraftRequest metadataUpdate;

        private ExistingDocumentDraft(UUID documentId) {
            this.documentId = documentId;
        }

        private UUID documentId() {
            return documentId;
        }

        private NewDocumentVersionDraftRequest newVersion() {
            return newVersion;
        }

        private void setNewVersion(NewDocumentVersionDraftRequest newVersion) {
            this.newVersion = newVersion;
        }

        private DocumentMetadataDraftRequest metadataUpdate() {
            return metadataUpdate;
        }

        private void setMetadataUpdate(DocumentMetadataDraftRequest metadataUpdate) {
            this.metadataUpdate = metadataUpdate;
        }

        private Long expectedVersion() {
            return newVersion != null ? newVersion.expectedDocumentVersion() : metadataUpdate.expectedVersion();
        }

        private DraftContext primaryContext() {
            return newVersion != null
                    ? new DraftContext(newVersion.tempUploadId(), documentId, "NEW_VERSION")
                    : new DraftContext(null, documentId, "METADATA_UPDATE");
        }
    }

    private record PromotedUpload(DocumentTempUploadEntity tempUpload, String permanentObjectKey) {
    }

    private record LinkedDocumentContext(DocumentVersionEntity version, DocumentLinkEntity link) {
    }
}
