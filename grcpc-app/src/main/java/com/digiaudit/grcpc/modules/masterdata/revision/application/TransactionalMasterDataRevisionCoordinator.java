package com.digiaudit.grcpc.modules.masterdata.revision.application;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.MasterDataRevision;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.MasterDataRevisionContent;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionDomain;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataHierarchyGuard;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class TransactionalMasterDataRevisionCoordinator implements MasterDataRevisionCoordinator {
    private final MasterDataRevisionPersistencePort persistencePort;
    private final MasterDataRevisionActorProvider actorProvider;
    private final Clock clock;
    private final RevisionMutationGuard mutationGuard;
    private final MasterDataHierarchyGuard hierarchyGuard;

    public TransactionalMasterDataRevisionCoordinator(
            MasterDataRevisionPersistencePort persistencePort,
            MasterDataRevisionActorProvider actorProvider,
            @Qualifier("masterDataRevisionClock") Clock clock,
            RevisionMutationGuard mutationGuard,
            MasterDataHierarchyGuard hierarchyGuard
    ) {
        this.persistencePort = Objects.requireNonNull(persistencePort, "persistencePort is required");
        this.actorProvider = Objects.requireNonNull(actorProvider, "actorProvider is required");
        this.clock = Objects.requireNonNull(clock, "clock is required");
        this.mutationGuard = Objects.requireNonNull(mutationGuard, "mutationGuard is required");
        this.hierarchyGuard = Objects.requireNonNull(hierarchyGuard, "hierarchyGuard is required");
    }

    @Override
    @Transactional
    public RevisionExecutionResult execute(RevisionRequest request, RevisionOperation operation) {
        Objects.requireNonNull(request, "request is required");
        Objects.requireNonNull(operation, "operation is required");

        return executeRevision(null, request, operation);
    }

    @Override
    @Transactional
    public RevisionExecutionResult executeStructural(
            MasterDataHierarchyKey hierarchyKey,
            RevisionRequest request,
            RevisionOperation operation
    ) {
        Objects.requireNonNull(hierarchyKey, "hierarchyKey is required");
        Objects.requireNonNull(request, "request is required");
        Objects.requireNonNull(operation, "operation is required");

        hierarchyGuard.lock(hierarchyKey);
        return executeRevision(hierarchyKey, request, operation);
    }

    private RevisionExecutionResult executeRevision(
            MasterDataHierarchyKey hierarchyKey,
            RevisionRequest request,
            RevisionOperation operation
    ) {

        MasterDataRevision revision = startRevision(request);
        RevisionExecutionContext draftContext = hierarchyKey == null
                ? RevisionExecutionContext.ordinaryFrom(revision)
                : RevisionExecutionContext.structuralFrom(revision, hierarchyKey);

        RevisionOperationResult operationResult = Objects.requireNonNull(
                operation.execute(draftContext),
                "revision operation result is required"
        );
        MasterDataMutationResult primaryResult = operationResult.primaryResult();
        verifyOperationResult(draftContext, request, operationResult);

        for (RevisionContentResult contentResult : operationResult.contentResults()) {
            revision.appendCompletedContent(UUID.randomUUID(), contentResult);
        }

        revision.apply(primaryResult);
        if (revision.status() != RevisionStatus.APPLIED) {
            throw new IllegalStateException("Revision aggregate did not reach APPLIED status");
        }

        UUID actorId = actorProvider.currentActorId();
        Instant occurredAt = Instant.now(clock);
        List<MasterDataRevisionContent> orderedContents = revision.contents();
        persistencePort.saveAppliedRevision(revision, orderedContents, new RevisionAuditMetadata(actorId, occurredAt));
        persistencePort.flush();

        RevisionExecutionContext appliedContext = hierarchyKey == null
                ? RevisionExecutionContext.ordinaryFrom(revision)
                : RevisionExecutionContext.structuralFrom(revision, hierarchyKey);
        return new RevisionExecutionResult(appliedContext, primaryResult, orderedContents);
    }

    private MasterDataRevision startRevision(RevisionRequest request) {
        UUID revisionId = UUID.randomUUID();
        long revisionNumber = persistencePort.nextRevisionNumber();
        if (request.domain() == RevisionDomain.CENTRAL) {
            return MasterDataRevision.startCentral(
                    revisionId,
                    revisionNumber,
                    request.title(),
                    request.description(),
                    request.causedByRevisionId()
            );
        }
        return MasterDataRevision.startLocal(
                revisionId,
                revisionNumber,
                request.title(),
                request.description(),
                request.organizationId(),
                request.causedByRevisionId()
        );
    }

    private void verifyOperationResult(
            RevisionExecutionContext context,
            RevisionRequest request,
            RevisionOperationResult operationResult
    ) {
        mutationGuard.requireMutationAllowed(
                context,
                request.domain(),
                request.organizationId(),
                operationResult.contentResults()
        );
        if (!operationResult.primaryResult().revisionId().equals(context.revisionId())) {
            throw new IllegalStateException("Primary mutation result revisionId does not match the execution context");
        }
    }
}
