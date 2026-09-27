package com.digiaudit.grcpc.modules.masterdata.local.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.local.domain.*;
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
@Table(name = "local_subprocess_risk_control_coverage")
public class LocalSubprocessRiskControlCoverageEntity {
  @Id
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
  private UUID id;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "organization_subprocess_scope_id", nullable = false, columnDefinition = "RAW(16)", updatable = false)
  private UUID organizationSubprocessScopeId;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "local_risk_scope_id", nullable = false, columnDefinition = "RAW(16)", updatable = false)
  private UUID localRiskScopeId;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "local_control_scope_id", nullable = false, columnDefinition = "RAW(16)", updatable = false)
  private UUID localControlScopeId;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "central_risk_control_coverage_id", columnDefinition = "RAW(16)", updatable = false)
  private UUID centralRiskControlCoverageId;
  @Enumerated(EnumType.STRING)
  @Column(name = "source_type", updatable = false, nullable = false)
  private LocalSourceType sourceType;
  @Column(name = "coverage_note", length = 1000)
  private String coverageNote;
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

  protected LocalSubprocessRiskControlCoverageEntity() {}

  private LocalSubprocessRiskControlCoverageEntity(UUID organizationSubprocessScopeId, UUID localRiskScopeId, UUID localControlScopeId, UUID centralRiskControlCoverageId, LocalSourceType sourceType, String coverageNote, LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
    this.id = UUID.randomUUID();
    this.organizationSubprocessScopeId = Objects.requireNonNull(organizationSubprocessScopeId);
    this.localRiskScopeId = Objects.requireNonNull(localRiskScopeId);
    this.localControlScopeId = Objects.requireNonNull(localControlScopeId);
    this.centralRiskControlCoverageId = centralRiskControlCoverageId;
    this.sourceType = Objects.requireNonNull(sourceType);
    this.coverageNote = coverageNote;
    this.status = MasterDataLifecycleStatus.ACTIVE;
    this.validFrom = validFrom;
    this.validTo = validTo;
    this.createdAt = Objects.requireNonNull(now);
    this.updatedAt = now;
    this.createdBy = Objects.requireNonNull(actorId);
    this.updatedBy = actorId;
    this.version = 0L;
  }

  public static LocalSubprocessRiskControlCoverageEntity create(UUID organizationSubprocessScopeId, UUID localRiskScopeId, UUID localControlScopeId, UUID centralRiskControlCoverageId, LocalSourceType sourceType, String coverageNote, LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
    return new LocalSubprocessRiskControlCoverageEntity(organizationSubprocessScopeId, localRiskScopeId, localControlScopeId, centralRiskControlCoverageId, sourceType, coverageNote, validFrom, validTo, actorId, now);
  }

  public void update(String coverageNote, LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
    if (status == MasterDataLifecycleStatus.DELETED) throw new IllegalStateException("Deleted Local row");
    this.coverageNote = coverageNote;
    this.validFrom = validFrom;
    this.validTo = validTo;
    touch(actorId, now);
  }
  public void activate(UUID actorId, Instant now) {
    require(MasterDataLifecycleStatus.INACTIVE);
    status = MasterDataLifecycleStatus.ACTIVE;
    touch(actorId, now);
  }
  public void inactivate(UUID actorId, Instant now) {
    require(MasterDataLifecycleStatus.ACTIVE);
    status = MasterDataLifecycleStatus.INACTIVE;
    touch(actorId, now);
  }
  public void delete(UUID actorId, Instant now) {
    if (status == MasterDataLifecycleStatus.DELETED) throw new IllegalStateException("Already deleted");
    status = MasterDataLifecycleStatus.DELETED;
    deletedAt = Objects.requireNonNull(now);
    deletedBy = Objects.requireNonNull(actorId);
    touch(actorId, now);
  }
  public void restore(UUID actorId, Instant now) {
    require(MasterDataLifecycleStatus.DELETED);
    status = MasterDataLifecycleStatus.ACTIVE;
    deletedAt = null;
    deletedBy = null;
    touch(actorId, now);
  }
  private void require(MasterDataLifecycleStatus expected) {
    if (status != expected) throw new IllegalStateException("Invalid Local transition");
  }
  private void touch(UUID actorId, Instant now) {
    updatedBy = Objects.requireNonNull(actorId);
    updatedAt = Objects.requireNonNull(now);
  }
  public UUID getId() { return id; }
  public UUID getOrganizationSubprocessScopeId() { return organizationSubprocessScopeId; }
  public UUID getLocalRiskScopeId() { return localRiskScopeId; }
  public UUID getLocalControlScopeId() { return localControlScopeId; }
  public UUID getCentralRiskControlCoverageId() { return centralRiskControlCoverageId; }
  public LocalSourceType getSourceType() { return sourceType; }
  public String getCoverageNote() { return coverageNote; }
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

