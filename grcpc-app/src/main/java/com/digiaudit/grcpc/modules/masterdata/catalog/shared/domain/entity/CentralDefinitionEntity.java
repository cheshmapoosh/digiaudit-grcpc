package com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.infrastructure.persistence.MasterDataLifecycleStatusConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Version;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

@MappedSuperclass
public abstract class CentralDefinitionEntity {
    @Id
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
    private UUID id;

    @Column(name = "code", nullable = false, length = 64)
    private String code;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Lob
    @Column(name = "description", columnDefinition = "CLOB")
    private String description;

    @Convert(converter = MasterDataLifecycleStatusConverter.class)
    @Column(name = "status", nullable = false, length = 32)
    private MasterDataLifecycleStatus status;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "created_by", nullable = false, columnDefinition = "RAW(16)")
    private UUID createdBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "updated_by", nullable = false, columnDefinition = "RAW(16)")
    private UUID updatedBy;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "deleted_by", columnDefinition = "RAW(16)")
    private UUID deletedBy;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected CentralDefinitionEntity() {
    }

    protected CentralDefinitionEntity(
            UUID id,
            String code,
            String title,
            String description,
            LocalDate validFrom,
            LocalDate validTo,
            UUID actorId,
            Instant now
    ) {
        this.id = Objects.requireNonNull(id, "id is required");
        this.code = Objects.requireNonNull(code, "code is required");
        this.title = Objects.requireNonNull(title, "title is required");
        this.description = description;
        this.status = MasterDataLifecycleStatus.ACTIVE;
        this.validFrom = validFrom;
        this.validTo = validTo;
        this.createdAt = Objects.requireNonNull(now, "now is required");
        this.createdBy = Objects.requireNonNull(actorId, "actorId is required");
        this.updatedAt = now;
        this.updatedBy = actorId;
        this.version = 0L;
    }

    protected final void updateDefinition(
            String title,
            String description,
            LocalDate validFrom,
            LocalDate validTo,
            UUID actorId,
            Instant now
    ) {
        requireNotDeleted();
        this.title = Objects.requireNonNull(title, "title is required");
        this.description = description;
        this.validFrom = validFrom;
        this.validTo = validTo;
        touch(actorId, now);
    }

    protected final void restoreDefinition(
            String title,
            String description,
            LocalDate validFrom,
            LocalDate validTo,
            UUID actorId,
            Instant now
    ) {
        requireStatus(MasterDataLifecycleStatus.DELETED);
        this.title = Objects.requireNonNull(title, "title is required");
        this.description = description;
        this.validFrom = validFrom;
        this.validTo = validTo;
        this.status = MasterDataLifecycleStatus.ACTIVE;
        this.deletedAt = null;
        this.deletedBy = null;
        touch(actorId, now);
    }

    protected final void reactivateDefinition(
            String title,
            String description,
            LocalDate validFrom,
            LocalDate validTo,
            UUID actorId,
            Instant now
    ) {
        requireStatus(MasterDataLifecycleStatus.INACTIVE);
        this.title = Objects.requireNonNull(title, "title is required");
        this.description = description;
        this.validFrom = validFrom;
        this.validTo = validTo;
        this.status = MasterDataLifecycleStatus.ACTIVE;
        touch(actorId, now);
    }

    public final void activate(UUID actorId, Instant now) {
        requireStatus(MasterDataLifecycleStatus.INACTIVE);
        status = MasterDataLifecycleStatus.ACTIVE;
        touch(actorId, now);
    }

    public final void inactivate(UUID actorId, Instant now) {
        requireStatus(MasterDataLifecycleStatus.ACTIVE);
        status = MasterDataLifecycleStatus.INACTIVE;
        touch(actorId, now);
    }

    public final void delete(UUID actorId, Instant now) {
        if (status != MasterDataLifecycleStatus.ACTIVE && status != MasterDataLifecycleStatus.INACTIVE) {
            throw new IllegalStateException("Only a nondeleted definition can be deleted");
        }
        status = MasterDataLifecycleStatus.DELETED;
        deletedAt = Objects.requireNonNull(now, "now is required");
        deletedBy = Objects.requireNonNull(actorId, "actorId is required");
        touch(actorId, now);
    }

    public final void restore(UUID actorId, Instant now) {
        requireStatus(MasterDataLifecycleStatus.DELETED);
        status = MasterDataLifecycleStatus.ACTIVE;
        deletedAt = null;
        deletedBy = null;
        touch(actorId, now);
    }

    public final void requireNotDeleted() {
        if (status == MasterDataLifecycleStatus.DELETED) {
            throw new IllegalStateException("Deleted definition cannot be mutated");
        }
    }

    protected final void touch(UUID actorId, Instant now) {
        updatedBy = Objects.requireNonNull(actorId, "actorId is required");
        updatedAt = Objects.requireNonNull(now, "now is required");
    }

    private void requireStatus(MasterDataLifecycleStatus required) {
        if (status != required) {
            throw new IllegalStateException("Invalid lifecycle transition from " + status + " to " + required);
        }
    }

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public MasterDataLifecycleStatus getStatus() { return status; }
    public LocalDate getValidFrom() { return validFrom; }
    public LocalDate getValidTo() { return validTo; }
    public Instant getCreatedAt() { return createdAt; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getUpdatedAt() { return updatedAt; }
    public UUID getUpdatedBy() { return updatedBy; }
    public Instant getDeletedAt() { return deletedAt; }
    public UUID getDeletedBy() { return deletedBy; }
    public long getVersion() { return version; }
}
