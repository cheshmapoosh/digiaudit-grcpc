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
        validateExpectedVersion(operationType, expectedVersion);
        this.expectedVersion = expectedVersion;
        this.beforeSnapshot = copy(beforeSnapshot);
        this.afterSnapshot = copy(afterSnapshot);
        this.appliedEntityVersion = validateAppliedEntityVersion(appliedEntityVersion);
        this.validationResult = copy(validationResult);
    }

    public static MasterDataRevisionContent backendDraft(
            UUID id,
            UUID revisionId,
            long sequenceNumber,
            RevisionEntityType entityType,
            UUID entityId,
            RevisionOperationType operationType,
            Long expectedVersion
    ) {
        return new MasterDataRevisionContent(
                id,
                revisionId,
                sequenceNumber,
                entityType,
                entityId,
                operationType,
                expectedVersion,
                null,
                null,
                null,
                null
        );
    }

    public MasterDataRevisionContent withBackendSnapshots(JsonNode beforeSnapshot, JsonNode afterSnapshot, JsonNode validationResult) {
        return new MasterDataRevisionContent(
                id,
                revisionId,
                sequenceNumber,
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

    public MasterDataRevisionContent withAppliedEntityVersion(long appliedEntityVersion) {
        return new MasterDataRevisionContent(
                id,
                revisionId,
                sequenceNumber,
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
        return copy(beforeSnapshot);
    }

    public JsonNode afterSnapshot() {
        return copy(afterSnapshot);
    }

    public Long appliedEntityVersion() {
        return appliedEntityVersion;
    }

    public JsonNode validationResult() {
        return copy(validationResult);
    }

    private static void validateExpectedVersion(RevisionOperationType operationType, Long expectedVersion) {
        if (operationType.requiresExpectedVersion() && expectedVersion == null) {
            throw new IllegalArgumentException("expectedVersion is required for " + operationType);
        }
        if (!operationType.requiresExpectedVersion() && expectedVersion != null) {
            throw new IllegalArgumentException("expectedVersion is not valid for " + operationType);
        }
        if (expectedVersion != null && expectedVersion < 0) {
            throw new IllegalArgumentException("expectedVersion must not be negative");
        }
    }

    private static Long validateAppliedEntityVersion(Long appliedEntityVersion) {
        if (appliedEntityVersion != null && appliedEntityVersion < 0) {
            throw new IllegalArgumentException("appliedEntityVersion must not be negative");
        }
        return appliedEntityVersion;
    }

    private static JsonNode copy(JsonNode node) {
        return node == null ? null : node.deepCopy();
    }
}
