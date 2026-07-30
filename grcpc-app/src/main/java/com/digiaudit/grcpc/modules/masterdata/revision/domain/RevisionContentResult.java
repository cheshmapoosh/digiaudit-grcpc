package com.digiaudit.grcpc.modules.masterdata.revision.domain;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.Objects;
import java.util.UUID;

public final class RevisionContentResult {
    private final RevisionEntityType entityType;
    private final UUID entityId;
    private final RevisionOperationType operationType;
    private final Long expectedVersion;
    private final JsonNode beforeSnapshot;
    private final JsonNode afterSnapshot;
    private final Long appliedEntityVersion;
    private final JsonNode validationResult;

    private RevisionContentResult(
            RevisionEntityType entityType,
            UUID entityId,
            RevisionOperationType operationType,
            Long expectedVersion,
            JsonNode beforeSnapshot,
            JsonNode afterSnapshot,
            Long appliedEntityVersion,
            JsonNode validationResult
    ) {
        this.entityType = Objects.requireNonNull(entityType, "entityType is required");
        this.entityId = Objects.requireNonNull(entityId, "entityId is required");
        this.operationType = Objects.requireNonNull(operationType, "operationType is required");
        validateExpectedVersion(operationType, expectedVersion);
        validateSnapshots(operationType, beforeSnapshot, afterSnapshot);
        this.expectedVersion = expectedVersion;
        this.beforeSnapshot = copy(beforeSnapshot);
        this.afterSnapshot = copy(afterSnapshot);
        this.appliedEntityVersion = validateAppliedEntityVersion(appliedEntityVersion);
        this.validationResult = copy(validationResult);
    }

    public static RevisionContentResult completed(
            RevisionEntityType entityType,
            UUID entityId,
            RevisionOperationType operationType,
            Long expectedVersion,
            JsonNode beforeSnapshot,
            JsonNode afterSnapshot,
            Long appliedEntityVersion,
            JsonNode validationResult
    ) {
        return new RevisionContentResult(
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

    public boolean representsPrimary(MasterDataMutationResult primaryResult) {
        Objects.requireNonNull(primaryResult, "primaryResult is required");
        return entityId.equals(primaryResult.entityId()) && appliedEntityVersion.longValue() == primaryResult.version();
    }

    static void validateExpectedVersion(RevisionOperationType operationType, Long expectedVersion) {
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

    static void validateSnapshots(RevisionOperationType operationType, JsonNode beforeSnapshot, JsonNode afterSnapshot) {
        if (operationType == RevisionOperationType.CREATE && beforeSnapshot != null) {
            throw new IllegalArgumentException("beforeSnapshot must be null for CREATE");
        }
        if (operationType != RevisionOperationType.CREATE && isAbsentSnapshot(beforeSnapshot)) {
            throw new IllegalArgumentException("beforeSnapshot is required for " + operationType);
        }
        if (isAbsentSnapshot(afterSnapshot)) {
            throw new IllegalArgumentException("afterSnapshot is required");
        }
    }

    static Long validateAppliedEntityVersion(Long appliedEntityVersion) {
        if (appliedEntityVersion == null) {
            throw new IllegalArgumentException("appliedEntityVersion is required");
        }
        if (appliedEntityVersion < 0) {
            throw new IllegalArgumentException("appliedEntityVersion must not be negative");
        }
        return appliedEntityVersion;
    }

    static JsonNode copy(JsonNode node) {
        return node == null ? null : node.deepCopy();
    }

    static boolean isAbsentSnapshot(JsonNode node) {
        return node == null || node.isNull() || node.isMissingNode();
    }
}
