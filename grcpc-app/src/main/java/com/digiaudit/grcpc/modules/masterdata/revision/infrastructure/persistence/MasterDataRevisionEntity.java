package com.digiaudit.grcpc.modules.masterdata.revision.infrastructure.persistence;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionDomain;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionStatus;
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
@Table(name = "masterdata_revision")
public class MasterDataRevisionEntity {
    @Id
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
    private UUID id;

    @Column(name = "revision_number", nullable = false)
    private long revisionNumber;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Lob
    @Column(name = "description", columnDefinition = "CLOB")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "revision_domain", nullable = false, length = 32)
    private RevisionDomain revisionDomain;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "organization_id", columnDefinition = "RAW(16)")
    private UUID organizationId;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "caused_by_revision_id", columnDefinition = "RAW(16)")
    private UUID causedByRevisionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "revision_status", nullable = false, length = 32)
    private RevisionStatus revisionStatus;

    @Column(name = "external_approval_reference", length = 255)
    private String externalApprovalReference;

    @Lob
    @Convert(converter = JsonNodeClobConverter.class)
    @Column(name = "impact_analysis_snapshot", columnDefinition = "CLOB")
    private JsonNode impactAnalysisSnapshot;

    @Column(name = "impact_analyzed_at")
    private Instant impactAnalyzedAt;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "impact_analyzed_by", columnDefinition = "RAW(16)")
    private UUID impactAnalyzedBy;

    @Column(name = "applied_at")
    private Instant appliedAt;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "applied_by", columnDefinition = "RAW(16)")
    private UUID appliedBy;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "cancelled_by", columnDefinition = "RAW(16)")
    private UUID cancelledBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "created_by", nullable = false, columnDefinition = "RAW(16)")
    private UUID createdBy;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "updated_by", nullable = false, columnDefinition = "RAW(16)")
    private UUID updatedBy;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected MasterDataRevisionEntity() {
    }

    private MasterDataRevisionEntity(
            UUID id,
            long revisionNumber,
            String title,
            String description,
            RevisionDomain revisionDomain,
            UUID organizationId,
            UUID causedByRevisionId,
            RevisionStatus revisionStatus,
            String externalApprovalReference,
            JsonNode impactAnalysisSnapshot,
            Instant impactAnalyzedAt,
            UUID impactAnalyzedBy,
            Instant appliedAt,
            UUID appliedBy,
            Instant cancelledAt,
            UUID cancelledBy,
            Instant createdAt,
            Instant updatedAt,
            UUID createdBy,
            UUID updatedBy
    ) {
        this.id = Objects.requireNonNull(id, "id is required");
        this.revisionNumber = revisionNumber;
        this.title = Objects.requireNonNull(title, "title is required");
        this.description = description;
        this.revisionDomain = Objects.requireNonNull(revisionDomain, "revisionDomain is required");
        this.organizationId = organizationId;
        this.causedByRevisionId = causedByRevisionId;
        this.revisionStatus = Objects.requireNonNull(revisionStatus, "revisionStatus is required");
        this.externalApprovalReference = externalApprovalReference;
        this.impactAnalysisSnapshot = copy(impactAnalysisSnapshot);
        this.impactAnalyzedAt = impactAnalyzedAt;
        this.impactAnalyzedBy = impactAnalyzedBy;
        this.appliedAt = appliedAt;
        this.appliedBy = appliedBy;
        this.cancelledAt = cancelledAt;
        this.cancelledBy = cancelledBy;
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt is required");
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt is required");
        this.createdBy = Objects.requireNonNull(createdBy, "createdBy is required");
        this.updatedBy = Objects.requireNonNull(updatedBy, "updatedBy is required");
        this.version = 0L;
    }

    public static MasterDataRevisionEntity applied(
            UUID id,
            long revisionNumber,
            String title,
            String description,
            RevisionDomain revisionDomain,
            UUID organizationId,
            UUID causedByRevisionId,
            UUID actorId,
            Instant occurredAt
    ) {
        Objects.requireNonNull(actorId, "actorId is required");
        Objects.requireNonNull(occurredAt, "occurredAt is required");
        return new MasterDataRevisionEntity(
                id,
                revisionNumber,
                title,
                description,
                revisionDomain,
                organizationId,
                causedByRevisionId,
                RevisionStatus.APPLIED,
                null,
                null,
                null,
                null,
                occurredAt,
                actorId,
                null,
                null,
                occurredAt,
                occurredAt,
                actorId,
                actorId
        );
    }

    public UUID getId() {
        return id;
    }

    public long getRevisionNumber() {
        return revisionNumber;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public RevisionDomain getRevisionDomain() {
        return revisionDomain;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getCausedByRevisionId() {
        return causedByRevisionId;
    }

    public RevisionStatus getRevisionStatus() {
        return revisionStatus;
    }

    public String getExternalApprovalReference() {
        return externalApprovalReference;
    }

    public JsonNode getImpactAnalysisSnapshot() {
        return copy(impactAnalysisSnapshot);
    }

    public Instant getImpactAnalyzedAt() {
        return impactAnalyzedAt;
    }

    public UUID getImpactAnalyzedBy() {
        return impactAnalyzedBy;
    }

    public Instant getAppliedAt() {
        return appliedAt;
    }

    public UUID getAppliedBy() {
        return appliedBy;
    }

    public Instant getCancelledAt() {
        return cancelledAt;
    }

    public UUID getCancelledBy() {
        return cancelledBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public UUID getUpdatedBy() {
        return updatedBy;
    }

    public long getVersion() {
        return version;
    }

    private static JsonNode copy(JsonNode node) {
        return node == null ? null : node.deepCopy();
    }
}
