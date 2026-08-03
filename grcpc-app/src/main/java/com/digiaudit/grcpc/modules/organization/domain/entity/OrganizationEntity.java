package com.digiaudit.grcpc.modules.organization.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.infrastructure.persistence.MasterDataLifecycleStatusConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "organization")
public class OrganizationEntity {
    @Id
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
    private UUID id;

    @Column(name = "code", nullable = false, length = 64)
    private String code;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "parent_organization_id", columnDefinition = "RAW(16)")
    private UUID parentOrganizationId;

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

    protected OrganizationEntity() {
    }

    private OrganizationEntity(
            UUID id,
            String code,
            UUID parentOrganizationId,
            LocalDate validFrom,
            LocalDate validTo,
            UUID actorId,
            Instant now
    ) {
        this.id = Objects.requireNonNull(id, "id is required");
        this.code = Objects.requireNonNull(code, "code is required");
        this.parentOrganizationId = parentOrganizationId;
        this.status = MasterDataLifecycleStatus.ACTIVE;
        this.validFrom = validFrom;
        this.validTo = validTo;
        this.createdAt = Objects.requireNonNull(now, "now is required");
        this.updatedAt = now;
        this.createdBy = Objects.requireNonNull(actorId, "actorId is required");
        this.updatedBy = actorId;
        this.version = 0L;
    }

    public static OrganizationEntity create(
            UUID id,
            String code,
            UUID parentOrganizationId,
            LocalDate validFrom,
            LocalDate validTo,
            UUID actorId,
            Instant now
    ) {
        return new OrganizationEntity(id, code, parentOrganizationId, validFrom, validTo, actorId, now);
    }

    public void updateValidity(LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
        requireNotDeleted();
        this.validFrom = validFrom;
        this.validTo = validTo;
        touch(actorId, now);
    }

    public void move(UUID parentOrganizationId, UUID actorId, Instant now) {
        requireNotDeleted();
        this.parentOrganizationId = parentOrganizationId;
        touch(actorId, now);
    }

    public void activate(UUID actorId, Instant now) {
        requireStatus(MasterDataLifecycleStatus.INACTIVE, "Only an inactive organization can be activated");
        this.status = MasterDataLifecycleStatus.ACTIVE;
        touch(actorId, now);
    }

    public void inactivate(UUID actorId, Instant now) {
        requireStatus(MasterDataLifecycleStatus.ACTIVE, "Only an active organization can be inactivated");
        this.status = MasterDataLifecycleStatus.INACTIVE;
        touch(actorId, now);
    }

    public void delete(UUID actorId, Instant now) {
        if (status != MasterDataLifecycleStatus.ACTIVE && status != MasterDataLifecycleStatus.INACTIVE) {
            throw new IllegalStateException("Only an active or inactive organization can be deleted");
        }
        this.status = MasterDataLifecycleStatus.DELETED;
        this.deletedAt = Objects.requireNonNull(now, "now is required");
        this.deletedBy = Objects.requireNonNull(actorId, "actorId is required");
        touch(actorId, now);
    }

    public void restore(UUID actorId, Instant now) {
        requireStatus(MasterDataLifecycleStatus.DELETED, "Only a deleted organization can be restored");
        this.status = MasterDataLifecycleStatus.ACTIVE;
        this.deletedAt = null;
        this.deletedBy = null;
        touch(actorId, now);
    }

    public void restoreFromCreate(UUID parentOrganizationId, LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
        this.parentOrganizationId = parentOrganizationId;
        this.validFrom = validFrom;
        this.validTo = validTo;
        restore(actorId, now);
    }

    public void reactivateFromCreate(UUID parentOrganizationId, LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
        requireStatus(MasterDataLifecycleStatus.INACTIVE, "Only an inactive organization can be reactivated");
        this.parentOrganizationId = parentOrganizationId;
        this.validFrom = validFrom;
        this.validTo = validTo;
        this.status = MasterDataLifecycleStatus.ACTIVE;
        touch(actorId, now);
    }

    public void requireNotDeleted() {
        if (status == MasterDataLifecycleStatus.DELETED) {
            throw new IllegalStateException("Deleted organization cannot be mutated");
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

    public UUID getParentOrganizationId() {
        return parentOrganizationId;
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
