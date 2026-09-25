package com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.infrastructure.persistence.MasterDataLifecycleStatusConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "central_subprocess_risk_control_objective_coverage")
public class CentralSubprocessRiskControlObjectiveCoverageEntity {
  @Id @JdbcTypeCode(SqlTypes.BINARY) @Column(name = "id", nullable = false, columnDefinition = "RAW(16)") private UUID id;
  @JdbcTypeCode(SqlTypes.BINARY) @Column(name = "subprocess_id", nullable = false, updatable = false, columnDefinition = "RAW(16)") private UUID subprocessId;
  @JdbcTypeCode(SqlTypes.BINARY) @Column(name = "risk_scope_id", nullable = false, updatable = false, columnDefinition = "RAW(16)") private UUID riskScopeId;
  @JdbcTypeCode(SqlTypes.BINARY) @Column(name = "control_objective_scope_id", nullable = false, updatable = false, columnDefinition = "RAW(16)") private UUID controlObjectiveScopeId;
  @Convert(converter = MasterDataLifecycleStatusConverter.class) @Column(name = "status", nullable = false, length = 32) private MasterDataLifecycleStatus status;
  @Column(name = "valid_from") private LocalDate validFrom;
  @Column(name = "valid_to") private LocalDate validTo;
  @Column(name = "created_at", nullable = false) private Instant createdAt;
  @Column(name = "updated_at", nullable = false) private Instant updatedAt;
  @JdbcTypeCode(SqlTypes.BINARY) @Column(name = "created_by", nullable = false, columnDefinition = "RAW(16)") private UUID createdBy;
  @JdbcTypeCode(SqlTypes.BINARY) @Column(name = "updated_by", nullable = false, columnDefinition = "RAW(16)") private UUID updatedBy;
  @Column(name = "deleted_at") private Instant deletedAt;
  @JdbcTypeCode(SqlTypes.BINARY) @Column(name = "deleted_by", columnDefinition = "RAW(16)") private UUID deletedBy;
  @Version @Column(name = "version", nullable = false) private long version;

  protected CentralSubprocessRiskControlObjectiveCoverageEntity() {}
  private CentralSubprocessRiskControlObjectiveCoverageEntity(UUID id, UUID subprocessId, UUID riskScopeId, UUID controlObjectiveScopeId, LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
    this.id = Objects.requireNonNull(id); this.subprocessId = Objects.requireNonNull(subprocessId); this.riskScopeId = Objects.requireNonNull(riskScopeId); this.controlObjectiveScopeId = Objects.requireNonNull(controlObjectiveScopeId);
    this.status = MasterDataLifecycleStatus.ACTIVE; this.validFrom = validFrom; this.validTo = validTo; this.createdAt = Objects.requireNonNull(now); this.updatedAt = now; this.createdBy = Objects.requireNonNull(actorId); this.updatedBy = actorId;
  }
  public static CentralSubprocessRiskControlObjectiveCoverageEntity create(UUID id, UUID subprocessId, UUID riskScopeId, UUID controlObjectiveScopeId, LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) { return new CentralSubprocessRiskControlObjectiveCoverageEntity(id, subprocessId, riskScopeId, controlObjectiveScopeId, validFrom, validTo, actorId, now); }
  public void update(LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) { requireNotDeleted(); this.validFrom = validFrom; this.validTo = validTo; touch(actorId, now); }
  public void reactivateFromCreate(LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) { requireStatus(MasterDataLifecycleStatus.INACTIVE); this.validFrom = validFrom; this.validTo = validTo; this.status = MasterDataLifecycleStatus.ACTIVE; touch(actorId, now); }
  public void restoreFromCreate(LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) { requireStatus(MasterDataLifecycleStatus.DELETED); this.validFrom = validFrom; this.validTo = validTo; restore(actorId, now); }
  public void activate(UUID actorId, Instant now) { requireStatus(MasterDataLifecycleStatus.INACTIVE); this.status = MasterDataLifecycleStatus.ACTIVE; touch(actorId, now); }
  public void inactivate(UUID actorId, Instant now) { requireStatus(MasterDataLifecycleStatus.ACTIVE); this.status = MasterDataLifecycleStatus.INACTIVE; touch(actorId, now); }
  public void delete(UUID actorId, Instant now) { if (status == MasterDataLifecycleStatus.DELETED) throw new IllegalStateException("Coverage already deleted"); status = MasterDataLifecycleStatus.DELETED; deletedAt = Objects.requireNonNull(now); deletedBy = Objects.requireNonNull(actorId); touch(actorId, now); }
  public void restore(UUID actorId, Instant now) { requireStatus(MasterDataLifecycleStatus.DELETED); status = MasterDataLifecycleStatus.ACTIVE; deletedAt = null; deletedBy = null; touch(actorId, now); }
  private void requireNotDeleted() { if (status == MasterDataLifecycleStatus.DELETED) throw new IllegalStateException("Deleted coverage cannot be updated"); }
  private void requireStatus(MasterDataLifecycleStatus required) { if (status != required) throw new IllegalStateException("Invalid coverage lifecycle transition"); }
  private void touch(UUID actorId, Instant now) { updatedBy = Objects.requireNonNull(actorId); updatedAt = Objects.requireNonNull(now); }
  public UUID getId() { return id; } public UUID getSubprocessId() { return subprocessId; } public UUID getRiskScopeId() { return riskScopeId; } public UUID getControlObjectiveScopeId() { return controlObjectiveScopeId; }
  public MasterDataLifecycleStatus getStatus() { return status; } public LocalDate getValidFrom() { return validFrom; } public LocalDate getValidTo() { return validTo; } public Instant getCreatedAt() { return createdAt; } public Instant getUpdatedAt() { return updatedAt; }
  public UUID getCreatedBy() { return createdBy; } public UUID getUpdatedBy() { return updatedBy; } public Instant getDeletedAt() { return deletedAt; } public UUID getDeletedBy() { return deletedBy; } public long getVersion() { return version; }
}

