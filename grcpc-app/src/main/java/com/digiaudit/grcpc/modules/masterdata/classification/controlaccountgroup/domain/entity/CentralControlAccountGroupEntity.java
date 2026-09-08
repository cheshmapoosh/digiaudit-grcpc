package com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.infrastructure.persistence.MasterDataLifecycleStatusConverter;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "central_control_account_group")
public class CentralControlAccountGroupEntity {
  @Id @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
  private UUID id;

  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "control_id", nullable = false, updatable = false, columnDefinition = "RAW(16)")
  private UUID controlId;

  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "account_group_id", nullable = false, updatable = false, columnDefinition = "RAW(16)")
  private UUID accountGroupId;

  @Convert(converter = MasterDataLifecycleStatusConverter.class)
  @Column(name = "status", nullable = false, length = 32)
  private MasterDataLifecycleStatus status;

  @Column(name = "valid_from") private LocalDate validFrom;
  @Column(name = "valid_to") private LocalDate validTo;
  @Column(name = "created_at", nullable = false) private Instant createdAt;
  @Column(name = "updated_at", nullable = false) private Instant updatedAt;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "created_by", nullable = false, columnDefinition = "RAW(16)") private UUID createdBy;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "updated_by", nullable = false, columnDefinition = "RAW(16)") private UUID updatedBy;
  @Column(name = "deleted_at") private Instant deletedAt;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "deleted_by", columnDefinition = "RAW(16)") private UUID deletedBy;
  @Version @Column(name = "version", nullable = false) private long version;

  protected CentralControlAccountGroupEntity() {}

  public static CentralControlAccountGroupEntity create(UUID id, UUID controlId, UUID accountGroupId,
      LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
    CentralControlAccountGroupEntity value = new CentralControlAccountGroupEntity();
    value.id = Objects.requireNonNull(id);
    value.controlId = Objects.requireNonNull(controlId);
    value.accountGroupId = Objects.requireNonNull(accountGroupId);
    value.status = MasterDataLifecycleStatus.ACTIVE;
    value.validFrom = validFrom;
    value.validTo = validTo;
    value.createdAt = Objects.requireNonNull(now);
    value.updatedAt = now;
    value.createdBy = Objects.requireNonNull(actorId);
    value.updatedBy = actorId;
    return value;
  }

  public void update(LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
    requireNotDeleted(); this.validFrom = validFrom; this.validTo = validTo; touch(actorId, now);
  }
  public void reactivateFromCreate(LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
    requireStatus(MasterDataLifecycleStatus.INACTIVE); this.validFrom = validFrom; this.validTo = validTo;
    status = MasterDataLifecycleStatus.ACTIVE; touch(actorId, now);
  }
  public void restoreFromCreate(LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
    requireStatus(MasterDataLifecycleStatus.DELETED); this.validFrom = validFrom; this.validTo = validTo;
    restore(actorId, now);
  }
  public void activate(UUID actorId, Instant now) { requireStatus(MasterDataLifecycleStatus.INACTIVE); status = MasterDataLifecycleStatus.ACTIVE; touch(actorId, now); }
  public void inactivate(UUID actorId, Instant now) { requireStatus(MasterDataLifecycleStatus.ACTIVE); status = MasterDataLifecycleStatus.INACTIVE; touch(actorId, now); }
  public void delete(UUID actorId, Instant now) {
    if (status == MasterDataLifecycleStatus.DELETED) throw new IllegalStateException("Classification is already deleted");
    status = MasterDataLifecycleStatus.DELETED; deletedAt = Objects.requireNonNull(now); deletedBy = Objects.requireNonNull(actorId); touch(actorId, now);
  }
  public void restore(UUID actorId, Instant now) { requireStatus(MasterDataLifecycleStatus.DELETED); status = MasterDataLifecycleStatus.ACTIVE; deletedAt = null; deletedBy = null; touch(actorId, now); }
  private void requireNotDeleted() { if (status == MasterDataLifecycleStatus.DELETED) throw new IllegalStateException("Deleted classification cannot be updated"); }
  private void requireStatus(MasterDataLifecycleStatus expected) { if (status != expected) throw new IllegalStateException("Invalid classification lifecycle transition"); }
  private void touch(UUID actorId, Instant now) { updatedBy = Objects.requireNonNull(actorId); updatedAt = Objects.requireNonNull(now); }

  public UUID getId() { return id; }
  public UUID getControlId() { return controlId; }
  public UUID getAccountGroupId() { return accountGroupId; }
  public MasterDataLifecycleStatus getStatus() { return status; }
  public LocalDate getValidFrom() { return validFrom; }
  public LocalDate getValidTo() { return validTo; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public UUID getCreatedBy() { return createdBy; }
  public UUID getUpdatedBy() { return updatedBy; }
  public Instant getDeletedAt() { return deletedAt; }
  public UUID getDeletedBy() { return deletedBy; }
  public long getVersion() { return version; }
}
