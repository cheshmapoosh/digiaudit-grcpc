package com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.infrastructure.persistence.MasterDataLifecycleStatusConverter;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "central_policy_requirement_scope")
public class CentralPolicyRequirementScopeEntity {
  @Id @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
  private UUID id;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "policy_id", nullable = false, updatable = false, columnDefinition = "RAW(16)")
  private UUID policyId;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "central_requirement_scope_id", nullable = false, updatable = false, columnDefinition = "RAW(16)")
  private UUID centralRequirementScopeId;
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

  protected CentralPolicyRequirementScopeEntity() {}
  public static CentralPolicyRequirementScopeEntity create(UUID policyId, UUID centralRequirementScopeId,
      LocalDate validFrom, LocalDate validTo, UUID actor, Instant now) {
    CentralPolicyRequirementScopeEntity row = new CentralPolicyRequirementScopeEntity();
    row.id = UUID.randomUUID();
    row.policyId = policyId;
    row.centralRequirementScopeId = centralRequirementScopeId;
    row.status = MasterDataLifecycleStatus.ACTIVE;
    row.validFrom = validFrom;
    row.validTo = validTo;
    row.createdAt = now;
    row.updatedAt = now;
    row.createdBy = actor;
    row.updatedBy = actor;
    return row;
  }
  public void update(LocalDate from, LocalDate to, UUID actor, Instant now) {
    if (status == MasterDataLifecycleStatus.DELETED) throw new IllegalStateException("Deleted relation");
    validFrom = from; validTo = to; touch(actor, now);
  }
  public void activate(UUID actor, Instant now) {
    if (status != MasterDataLifecycleStatus.INACTIVE) throw new IllegalStateException("Invalid activation");
    status = MasterDataLifecycleStatus.ACTIVE; touch(actor, now);
  }
  public void inactivate(UUID actor, Instant now) {
    if (status != MasterDataLifecycleStatus.ACTIVE) throw new IllegalStateException("Invalid inactivation");
    status = MasterDataLifecycleStatus.INACTIVE; touch(actor, now);
  }
  public void delete(UUID actor, Instant now) {
    if (status == MasterDataLifecycleStatus.DELETED) throw new IllegalStateException("Already deleted");
    status = MasterDataLifecycleStatus.DELETED;
    deletedAt = now; deletedBy = actor; touch(actor, now);
  }
  public void restore(UUID actor, Instant now) {
    if (status != MasterDataLifecycleStatus.DELETED) throw new IllegalStateException("Not deleted");
    status = MasterDataLifecycleStatus.ACTIVE;
    deletedAt = null; deletedBy = null; touch(actor, now);
  }
  private void touch(UUID actor, Instant now) { updatedBy = actor; updatedAt = now; }
  public UUID getId() { return id; }
  public UUID getPolicyId() { return policyId; }
  public UUID getCentralRequirementScopeId() { return centralRequirementScopeId; }
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

