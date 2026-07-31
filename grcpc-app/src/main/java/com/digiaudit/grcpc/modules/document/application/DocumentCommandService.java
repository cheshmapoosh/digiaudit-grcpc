package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentLinkSummaryResponse;
import com.digiaudit.grcpc.modules.document.application.DocumentCommands.AddVersion;
import com.digiaudit.grcpc.modules.document.application.DocumentCommands.CreateLinkedDocument;
import com.digiaudit.grcpc.modules.document.application.DocumentCommands.DocumentLifecycle;
import com.digiaudit.grcpc.modules.document.application.DocumentCommands.LifecycleAction;
import com.digiaudit.grcpc.modules.document.application.DocumentCommands.LinkExistingVersion;
import com.digiaudit.grcpc.modules.document.application.DocumentCommands.LinkLifecycle;
import com.digiaudit.grcpc.modules.document.application.DocumentCommands.UpdateMetadata;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.document.domain.DocumentTargetContext;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentLinkEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.InternalDocumentLinkJpaRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionCoordinator;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionResult;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionOperationResult;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionRequest;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionDomain;
import com.digiaudit.grcpc.modules.securityacl.application.ResourceAuthorizationService;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;

@Service
public class DocumentCommandService {
    private static final String UPLOAD_PERMISSION = "DOCUMENT_UPLOAD";
    private static final String DELETE_PERMISSION = "DOCUMENT_DELETE";

    private final MasterDataRevisionCoordinator revisionCoordinator;
    private final DocumentRevisionParticipant participant;
    private final DocumentTargetContextResolver targetContextResolver;
    private final ResourceAuthorizationService authorizationService;
    private final CurrentUserProvider currentUserProvider;
    private final InternalDocumentLinkJpaRepository linkRepository;
    private final DocumentReadService readService;

    public DocumentCommandService(
            MasterDataRevisionCoordinator revisionCoordinator,
            DocumentRevisionParticipant participant,
            DocumentTargetContextResolver targetContextResolver,
            ResourceAuthorizationService authorizationService,
            CurrentUserProvider currentUserProvider,
            InternalDocumentLinkJpaRepository linkRepository,
            DocumentReadService readService
    ) {
        this.revisionCoordinator = Objects.requireNonNull(revisionCoordinator, "revisionCoordinator is required");
        this.participant = Objects.requireNonNull(participant, "participant is required");
        this.targetContextResolver = Objects.requireNonNull(targetContextResolver, "targetContextResolver is required");
        this.authorizationService = Objects.requireNonNull(authorizationService, "authorizationService is required");
        this.currentUserProvider = Objects.requireNonNull(currentUserProvider, "currentUserProvider is required");
        this.linkRepository = Objects.requireNonNull(linkRepository, "linkRepository is required");
        this.readService = Objects.requireNonNull(readService, "readService is required");
    }

    public DocumentCommandResponse createLinkedDocument(CreateLinkedDocument command) {
        DocumentTargetContext targetContext = resolveAndAuthorize(command.targetType(), command.targetId(), UPLOAD_PERMISSION);
        UUID actorId = actorId();
        return execute(
                targetContext,
                "Create Document",
                "Create linked Document",
                context -> participant.createLinkedDocument(context, command, targetContext, actorId)
        );
    }

    public DocumentCommandResponse addVersion(AddVersion command) {
        DocumentTargetContext targetContext = resolveAndAuthorize(command.targetType(), command.targetId(), UPLOAD_PERMISSION);
        UUID actorId = actorId();
        return execute(
                targetContext,
                "Add Document Version",
                "Add immutable Document Version",
                context -> participant.addVersion(context, command, targetContext, actorId)
        );
    }

    public DocumentCommandResponse updateMetadata(UpdateMetadata command) {
        DocumentTargetContext targetContext = resolveAndAuthorize(command.targetType(), command.targetId(), UPLOAD_PERMISSION);
        UUID actorId = actorId();
        return execute(
                targetContext,
                "Update Document",
                "Update Document metadata",
                context -> participant.updateMetadata(context, command, targetContext, actorId)
        );
    }

    public DocumentCommandResponse documentLifecycle(DocumentLifecycle command) {
        String permission = command.action() == LifecycleAction.DELETE ? DELETE_PERMISSION : UPLOAD_PERMISSION;
        DocumentTargetContext targetContext = resolveAndAuthorize(command.targetType(), command.targetId(), permission);
        UUID actorId = actorId();
        return execute(
                targetContext,
                command.action().name() + " Document",
                command.action().name() + " Document lifecycle",
                context -> participant.documentLifecycle(context, command, targetContext, actorId)
        );
    }

    public DocumentCommandResponse linkExistingVersion(LinkExistingVersion command) {
        DocumentTargetContext targetContext = resolveAndAuthorize(command.targetType(), command.targetId(), UPLOAD_PERMISSION);
        UUID actorId = actorId();
        return execute(
                targetContext,
                "Link Document Version",
                "Link immutable Document Version",
                context -> participant.linkExistingVersion(context, command, targetContext, actorId)
        );
    }

    public DocumentCommandResponse linkLifecycle(LinkLifecycle command) {
        DocumentLinkEntity link = linkRepository.findById(command.linkId())
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_LINK_NOT_FOUND", "Document link was not found"));
        if (!link.getTargetType().isPublicSelectable()) {
            throw DocumentFailures.invalid("TARGET_NOT_ALLOWED", "Document link target type is not allowed from browser requests");
        }
        String permission = command.action() == LifecycleAction.DELETE ? DELETE_PERMISSION : UPLOAD_PERMISSION;
        DocumentTargetContext targetContext = resolveAndAuthorize(link.getTargetType(), link.getTargetId(), permission);
        UUID actorId = actorId();
        return execute(
                targetContext,
                command.action().name() + " Document Link",
                command.action().name() + " Document Link lifecycle",
                context -> participant.linkLifecycle(context, command, actorId)
        );
    }

    private DocumentCommandResponse execute(
            DocumentTargetContext targetContext,
            String title,
            String description,
            Function<com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext, DocumentParticipantResult> operation
    ) {
        AtomicReference<DocumentParticipantResult> participantResult = new AtomicReference<>();
        RevisionRequest request = revisionRequest(targetContext, title, description);
        RevisionExecutionResult executionResult = revisionCoordinator.execute(request, context -> {
            DocumentParticipantResult result = operation.apply(context);
            participantResult.set(result);
            return RevisionOperationResult.completed(context, result.primaryResult(), result.contentResults());
        });
        DocumentParticipantResult result = participantResult.get();
        DocumentLinkSummaryResponse summary = result.documentLinkId() == null
                ? null
                : readService.findSummaryByLinkId(result.documentLinkId());
        long documentVersion = summary == null
                ? executionResult.primaryResult().version()
                : summary.documentVersion();
        return new DocumentCommandResponse(
                executionResult.primaryResult().entityId(),
                executionResult.context().revisionId(),
                documentVersion,
                result.documentVersionId(),
                result.documentVersionNumber(),
                result.documentLinkId(),
                summary
        );
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

    private RevisionRequest revisionRequest(DocumentTargetContext targetContext, String title, String description) {
        if (targetContext.revisionDomain() == RevisionDomain.CENTRAL) {
            return RevisionRequest.central(title, description, null);
        }
        return RevisionRequest.local(targetContext.organizationId(), title, description, null);
    }

    private UUID actorId() {
        return currentUserProvider.getCurrentUserIdOptional()
                .orElseThrow(() -> DocumentFailures.forbidden("DOCUMENT_ACTOR_REQUIRED", "Authenticated user is required"));
    }
}
