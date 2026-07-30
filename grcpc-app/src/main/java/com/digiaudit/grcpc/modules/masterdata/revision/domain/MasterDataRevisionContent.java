package com.digiaudit.grcpc.modules.masterdata.revision.domain;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.Objects;
import java.util.UUID;

public final class MasterDataRevisionContent {
    private final UUID id;
    private final UUID revisionId;
    private final long sequenceNumber;
    private final RevisionEntityType entityType;
    private final UUID entityId;
    private final RevisionOperationType operationType;
    private final Long expectedVersion;
    private final JsonNode beforeSnapshot;
    private final JsonNode afterSnapshot;
    private final Long appliedEntityVersion;
    private final JsonNode validationResult;

    private MasterDataRevisionContent(
            UUID id,
            UUID revisionId,
            long sequenceNumber,
            RevisionEntityType entityType,
            UUID entityId,
            RevisionOperationType operationType,
            Long expectedVersion,
            JsonNode beforeSnapshot,
            JsonNode afterSnapshot,
            Long appliedEntityVersion,
            JsonNode validationResult
    ) {
        this.id = Objects.requireNonNull(id, "id is required");
        this.revisionId = Objects.requireNonNull(revisionId, "revisionId is required");
        if (sequenceNumber <= 0) {
            throw new IllegalArgumentException("sequenceNumber must be positive");
        }
        this.sequenceNumber = sequenceNumber;
        this.entityType = Objects.requireNonNull(entityType, "entityType is required");
        this.entityId = Objects.requireNonNull(entityId, "entityId is required");
        this.operationType = Objects.requireNonNull(operationType, "operationType is required");
        RevisionContentResult.validateExpectedVersion(operationType, expectedVersion);
        RevisionContentResult.validateSnapshots(operationType, beforeSnapshot, afterSnapshot);
        this.expectedVersion = expectedVersion;
        this.beforeSnapshot = RevisionContentResult.copy(beforeSnapshot);
        this.afterSnapshot = RevisionContentResult.copy(afterSnapshot);
        this.appliedEntityVersion = RevisionContentResult.validateAppliedEntityVersion(appliedEntityVersion);
        this.validationResult = RevisionContentResult.copy(validationResult);
    }

    static MasterDataRevisionContent completed(
            UUID id,
            UUID revisionId,
            long sequenceNumber,
            RevisionContentResult result
    ) {
        return new MasterDataRevisionContent(
                id,
                revisionId,
                sequenceNumber,
                result.entityType(),
                result.entityId(),
                result.operationType(),
                result.expectedVersion(),
                result.beforeSnapshot(),
                result.afterSnapshot(),
                result.appliedEntityVersion(),
                result.validationResult()
        );
    }

    public UUID id() {
        return id;
    }

    public UUID revisionId() {
        return revisionId;
    }

    public long sequenceNumber() {
        return sequenceNumber;
    }

    public RevisionEntityType entityType() {
        return entityType;
    }

    public UUID entityId() {
        return entityId;
    }

    public RevisionOperationType operationType() {
        return operationType;
    }

    public Long expectedVersion() {
        return expectedVersion;
    }

    public JsonNode beforeSnapshot() {
        return RevisionContentResult.copy(beforeSnapshot);
    }

    public JsonNode afterSnapshot() {
        return RevisionContentResult.copy(afterSnapshot);
    }

    public Long appliedEntityVersion() {
        return appliedEntityVersion;
    }

    public JsonNode validationResult() {
        return RevisionContentResult.copy(validationResult);
    }

    boolean isReadyForApply(UUID expectedRevisionId, RevisionDomain expectedDomain) {
        return revisionId.equals(expectedRevisionId)
                && sequenceNumber > 0
                && entityType.isPermittedIn(expectedDomain)
                && expectedVersionIsValid()
                && snapshotsAreValid()
                && appliedEntityVersion != null
                && appliedEntityVersion >= 0;
    }

    boolean representsPrimary(com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult primaryResult) {
        Objects.requireNonNull(primaryResult, "primaryResult is required");
        return entityId.equals(primaryResult.entityId()) && appliedEntityVersion.longValue() == primaryResult.version();
    }

    private boolean expectedVersionIsValid() {
        if (operationType.requiresExpectedVersion()) {
            return expectedVersion != null && expectedVersion >= 0;
        }
        return expectedVersion == null;
    }

    private boolean snapshotsAreValid() {
        if (RevisionContentResult.isAbsentSnapshot(afterSnapshot)) {
            return false;
        }
        if (operationType == RevisionOperationType.CREATE) {
            return beforeSnapshot == null;
        }
        return !RevisionContentResult.isAbsentSnapshot(beforeSnapshot);
    }
}
