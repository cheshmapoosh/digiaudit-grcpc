package com.digiaudit.grcpc.modules.masterdata.process.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.infrastructure.persistence.MasterDataLifecycleStatusConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "central_subprocess")
public class CentralSubprocessEntity {
    @Id
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
    private UUID id;

    @Column(name = "code", nullable = false, length = 64)
    private String code;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "process_id", nullable = false, columnDefinition = "RAW(16)")
    private UUID processId;

    @Lob
    @Column(name = "description", columnDefinition = "CLOB")
    private String description;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Convert(converter = MasterDataLifecycleStatusConverter.class)
    @Column(name = "status", nullable = false, length = 32)
    private MasterDataLifecycleStatus status;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

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

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "deleted_by", columnDefinition = "RAW(16)")
    private UUID deletedBy;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected CentralSubprocessEntity() {
    }

    private CentralSubprocessEntity(
            UUID id,
            String code,
            String title,
            UUID processId,
            String description,
            int sortOrder,
            LocalDate validFrom,
            LocalDate validTo,
            UUID actorId,
            Instant now
    ) {
        this.id = Objects.requireNonNull(id, "id is required");
        this.code = Objects.requireNonNull(code, "code is required");
        this.title = Objects.requireNonNull(title, "title is required");
        this.processId = Objects.requireNonNull(processId, "processId is required");
        this.description = description;
        this.sortOrder = sortOrder;
        this.status = MasterDataLifecycleStatus.ACTIVE;
        this.validFrom = validFrom;
        this.validTo = validTo;
        this.createdAt = Objects.requireNonNull(now, "now is required");
        this.updatedAt = now;
        this.createdBy = Objects.requireNonNull(actorId, "actorId is required");
        this.updatedBy = actorId;
        this.version = 0L;
    }

    public static CentralSubprocessEntity create(
            UUID id,
            String code,
            String title,
            UUID processId,
            String description,
            int sortOrder,
            LocalDate validFrom,
            LocalDate validTo,
            UUID actorId,
            Instant now
    ) {
        return new CentralSubprocessEntity(id, code, title, processId, description, sortOrder, validFrom, validTo, actorId, now);
    }

    public void updateDetails(
            String title,
            String description,
            int sortOrder,
            MasterDataLifecycleStatus requestedStatus,
            LocalDate validFrom,
            LocalDate validTo,
            UUID actorId,
            Instant now
    ) {
        requireNotDeleted();
        if (requestedStatus == MasterDataLifecycleStatus.DELETED) {
            throw new IllegalArgumentException("DELETED is not valid for Subprocess General Information update");
        }
        this.title = Objects.requireNonNull(title, "title is required");
        this.description = description;
        this.sortOrder = sortOrder;
        this.status = Objects.requireNonNull(requestedStatus, "requestedStatus is required");
        this.validFrom = validFrom;
        this.validTo = validTo;
        touch(actorId, now);
    }

    public void move(UUID processId, UUID actorId, Instant now) {
        requireNotDeleted();
        this.processId = Objects.requireNonNull(processId, "processId is required");
        touch(actorId, now);
    }

    public void activate(UUID actorId, Instant now) {
        requireStatus(MasterDataLifecycleStatus.INACTIVE, "Only an inactive central subprocess can be activated");
        this.status = MasterDataLifecycleStatus.ACTIVE;
        touch(actorId, now);
    }

    public void inactivate(UUID actorId, Instant now) {
        requireStatus(MasterDataLifecycleStatus.ACTIVE, "Only an active central subprocess can be inactivated");
        this.status = MasterDataLifecycleStatus.INACTIVE;
        touch(actorId, now);
    }

    public void delete(UUID actorId, Instant now) {
        if (status != MasterDataLifecycleStatus.ACTIVE && status != MasterDataLifecycleStatus.INACTIVE) {
            throw new IllegalStateException("Only an active or inactive central subprocess can be deleted");
        }
        this.status = MasterDataLifecycleStatus.DELETED;
        this.deletedAt = Objects.requireNonNull(now, "now is required");
        this.deletedBy = Objects.requireNonNull(actorId, "actorId is required");
        touch(actorId, now);
    }

    public void restore(UUID actorId, Instant now) {
        requireStatus(MasterDataLifecycleStatus.DELETED, "Only a deleted central subprocess can be restored");
        this.status = MasterDataLifecycleStatus.ACTIVE;
        this.deletedAt = null;
        this.deletedBy = null;
        touch(actorId, now);
    }

    public void restoreFromCreate(String title, UUID processId, String description, int sortOrder, LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
        this.title = title;
        this.processId = processId;
        this.description = description;
        this.sortOrder = sortOrder;
        this.validFrom = validFrom;
        this.validTo = validTo;
        restore(actorId, now);
    }

    public void reactivateFromCreate(String title, UUID processId, String description, int sortOrder, LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
        requireStatus(MasterDataLifecycleStatus.INACTIVE, "Only an inactive central subprocess can be reactivated");
        this.title = title;
        this.processId = processId;
        this.description = description;
        this.sortOrder = sortOrder;
        this.validFrom = validFrom;
        this.validTo = validTo;
        this.status = MasterDataLifecycleStatus.ACTIVE;
        touch(actorId, now);
    }

    public void requireNotDeleted() {
        if (status == MasterDataLifecycleStatus.DELETED) {
            throw new IllegalStateException("Deleted central subprocess cannot be mutated");
        }
    }

    private void requireStatus(MasterDataLifecycleStatus requiredStatus, String message) {
        if (status != requiredStatus) {
            throw new IllegalStateException(message);
        }
    }

    private void touch(UUID actorId, Instant now) {
        this.updatedBy = Objects.requireNonNull(actorId, "actorId is required");
        this.updatedAt = Objects.requireNonNull(now, "now is required");
    }

    public UUID getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getTitle() {
        return title;
    }

    public UUID getProcessId() {
        return processId;
    }

    public String getDescription() {
        return description;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public MasterDataLifecycleStatus getStatus() {
        return status;
    }

    public LocalDate getValidFrom() {
        return validFrom;
    }

    public LocalDate getValidTo() {
        return validTo;
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

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public UUID getDeletedBy() {
        return deletedBy;
    }

    public long getVersion() {
        return version;
    }
}
