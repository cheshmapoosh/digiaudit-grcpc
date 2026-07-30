package com.digiaudit.grcpc.modules.masterdata.revision.infrastructure.persistence;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "masterdata_revision_content")
public class MasterDataRevisionContentEntity {
    @Id
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
    private UUID id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "revision_id", nullable = false, columnDefinition = "RAW(16)")
    private UUID revisionId;

    @Column(name = "sequence_number", nullable = false)
    private long sequenceNumber;

    @Convert(converter = RevisionEntityTypeConverter.class)
    @Column(name = "entity_type", nullable = false, length = 32)
    private RevisionEntityType entityType;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "entity_id", nullable = false, columnDefinition = "RAW(16)")
    private UUID entityId;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation_type", nullable = false, length = 32)
    private RevisionOperationType operationType;

    @Column(name = "expected_version")
    private Long expectedVersion;

    @Lob
    @Convert(converter = JsonNodeClobConverter.class)
    @Column(name = "before_snapshot", columnDefinition = "CLOB")
    private JsonNode beforeSnapshot;

    @Lob
    @Convert(converter = JsonNodeClobConverter.class)
    @Column(name = "after_snapshot", columnDefinition = "CLOB")
    private JsonNode afterSnapshot;

    @Column(name = "applied_entity_version")
    private Long appliedEntityVersion;

    @Lob
    @Convert(converter = JsonNodeClobConverter.class)
    @Column(name = "validation_result", columnDefinition = "CLOB")
    private JsonNode validationResult;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "created_by", nullable = false, columnDefinition = "RAW(16)")
    private UUID createdBy;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected MasterDataRevisionContentEntity() {
    }

    private MasterDataRevisionContentEntity(
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
            JsonNode validationResult,
            Instant createdAt,
            UUID createdBy
    ) {
        this.id = Objects.requireNonNull(id, "id is required");
        this.revisionId = Objects.requireNonNull(revisionId, "revisionId is required");
        this.sequenceNumber = sequenceNumber;
        this.entityType = Objects.requireNonNull(entityType, "entityType is required");
        this.entityId = Objects.requireNonNull(entityId, "entityId is required");
        this.operationType = Objects.requireNonNull(operationType, "operationType is required");
        this.expectedVersion = expectedVersion;
        this.beforeSnapshot = copy(beforeSnapshot);
        this.afterSnapshot = copy(afterSnapshot);
        this.appliedEntityVersion = Objects.requireNonNull(appliedEntityVersion, "appliedEntityVersion is required");
        this.validationResult = copy(validationResult);
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt is required");
        this.createdBy = Objects.requireNonNull(createdBy, "createdBy is required");
        this.version = 0L;
    }

    public static MasterDataRevisionContentEntity completed(
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
            JsonNode validationResult,
            Instant createdAt,
            UUID createdBy
    ) {
        return new MasterDataRevisionContentEntity(
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
                validationResult,
                createdAt,
                createdBy
        );
    }

    public UUID getId() {
        return id;
    }

    public UUID getRevisionId() {
        return revisionId;
    }

    public long getSequenceNumber() {
        return sequenceNumber;
    }

    public RevisionEntityType getEntityType() {
        return entityType;
    }

    public UUID getEntityId() {
        return entityId;
    }

    public RevisionOperationType getOperationType() {
        return operationType;
    }

    public Long getExpectedVersion() {
        return expectedVersion;
    }

    public JsonNode getBeforeSnapshot() {
        return copy(beforeSnapshot);
    }

    public JsonNode getAfterSnapshot() {
        return copy(afterSnapshot);
    }

    public Long getAppliedEntityVersion() {
        return appliedEntityVersion;
    }

    public JsonNode getValidationResult() {
        return copy(validationResult);
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public long getVersion() {
        return version;
    }

    private static JsonNode copy(JsonNode node) {
        return node == null ? null : node.deepCopy();
    }
}
