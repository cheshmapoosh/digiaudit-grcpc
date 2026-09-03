package com.digiaudit.grcpc.modules.masterdata.scope.control.domain.entity;

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
@Table(name = "central_subprocess_control_scope")
public class CentralSubprocessControlScopeEntity {
  @Id
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
  private UUID id;

  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "subprocess_id", nullable = false, updatable = false, columnDefinition = "RAW(16)")
  private UUID subprocessId;

  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "control_id", nullable = false, updatable = false, columnDefinition = "RAW(16)")
  private UUID controlId;

  @Column(name = "recommended_frequency_code", length = 64)
  private String recommendedFrequencyCode;

  @Column(name = "recommended_execution_method_code", length = 64)
  private String recommendedExecutionMethodCode;

  @Column(name = "recommended_test_method_code", length = 64)
  private String recommendedTestMethodCode;

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

  protected CentralSubprocessControlScopeEntity() {}

  private CentralSubprocessControlScopeEntity(
      UUID id,
      UUID subprocessId,
      UUID controlId,
      String recommendedFrequencyCode,
      String recommendedExecutionMethodCode,
      String recommendedTestMethodCode,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    this.id = Objects.requireNonNull(id, "id is required");
    this.subprocessId = Objects.requireNonNull(subprocessId, "subprocessId is required");
    this.controlId = Objects.requireNonNull(controlId, "controlId is required");
    applyRecommendations(
        recommendedFrequencyCode, recommendedExecutionMethodCode, recommendedTestMethodCode);
    this.status = MasterDataLifecycleStatus.ACTIVE;
    this.validFrom = validFrom;
    this.validTo = validTo;
    this.createdAt = Objects.requireNonNull(now, "now is required");
    this.updatedAt = now;
    this.createdBy = Objects.requireNonNull(actorId, "actorId is required");
    this.updatedBy = actorId;
  }

  public static CentralSubprocessControlScopeEntity create(
      UUID id,
      UUID subprocessId,
      UUID controlId,
      String recommendedFrequencyCode,
      String recommendedExecutionMethodCode,
      String recommendedTestMethodCode,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    return new CentralSubprocessControlScopeEntity(
        id,
        subprocessId,
        controlId,
        recommendedFrequencyCode,
        recommendedExecutionMethodCode,
        recommendedTestMethodCode,
        validFrom,
        validTo,
        actorId,
        now);
  }

  public void update(
      String recommendedFrequencyCode,
      String recommendedExecutionMethodCode,
      String recommendedTestMethodCode,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    requireNotDeleted();
    applyRecommendations(
        recommendedFrequencyCode, recommendedExecutionMethodCode, recommendedTestMethodCode);
    this.validFrom = validFrom;
    this.validTo = validTo;
    touch(actorId, now);
  }

  public void reactivateFromCreate(
      String recommendedFrequencyCode,
      String recommendedExecutionMethodCode,
      String recommendedTestMethodCode,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    requireStatus(MasterDataLifecycleStatus.INACTIVE);
    applyRecommendations(
        recommendedFrequencyCode, recommendedExecutionMethodCode, recommendedTestMethodCode);
    this.validFrom = validFrom;
    this.validTo = validTo;
    this.status = MasterDataLifecycleStatus.ACTIVE;
    touch(actorId, now);
  }

  public void restoreFromCreate(
      String recommendedFrequencyCode,
      String recommendedExecutionMethodCode,
      String recommendedTestMethodCode,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    requireStatus(MasterDataLifecycleStatus.DELETED);
    applyRecommendations(
        recommendedFrequencyCode, recommendedExecutionMethodCode, recommendedTestMethodCode);
    this.validFrom = validFrom;
    this.validTo = validTo;
    restore(actorId, now);
  }

  public void activate(UUID actorId, Instant now) {
    requireStatus(MasterDataLifecycleStatus.INACTIVE);
    this.status = MasterDataLifecycleStatus.ACTIVE;
    touch(actorId, now);
  }

  public void inactivate(UUID actorId, Instant now) {
    requireStatus(MasterDataLifecycleStatus.ACTIVE);
    this.status = MasterDataLifecycleStatus.INACTIVE;
    touch(actorId, now);
  }

  public void delete(UUID actorId, Instant now) {
    if (status != MasterDataLifecycleStatus.ACTIVE
        && status != MasterDataLifecycleStatus.INACTIVE) {
      throw new IllegalStateException("Only a nondeleted control scope can be deleted");
    }
    this.status = MasterDataLifecycleStatus.DELETED;
    this.deletedAt = Objects.requireNonNull(now, "now is required");
    this.deletedBy = Objects.requireNonNull(actorId, "actorId is required");
    touch(actorId, now);
  }

  public void restore(UUID actorId, Instant now) {
    requireStatus(MasterDataLifecycleStatus.DELETED);
    this.status = MasterDataLifecycleStatus.ACTIVE;
    this.deletedAt = null;
    this.deletedBy = null;
    touch(actorId, now);
  }

  private void applyRecommendations(String frequency, String executionMethod, String testMethod) {
    this.recommendedFrequencyCode = frequency;
    this.recommendedExecutionMethodCode = executionMethod;
    this.recommendedTestMethodCode = testMethod;
  }

  private void requireNotDeleted() {
    if (status == MasterDataLifecycleStatus.DELETED) {
      throw new IllegalStateException("Deleted control scope cannot be updated");
    }
  }

  private void requireStatus(MasterDataLifecycleStatus required) {
    if (status != required) {
      throw new IllegalStateException("Invalid control scope lifecycle transition");
    }
  }

  private void touch(UUID actorId, Instant now) {
    this.updatedBy = Objects.requireNonNull(actorId, "actorId is required");
    this.updatedAt = Objects.requireNonNull(now, "now is required");
  }

  public UUID getId() { return id; }
  public UUID getSubprocessId() { return subprocessId; }
  public UUID getControlId() { return controlId; }
  public String getRecommendedFrequencyCode() { return recommendedFrequencyCode; }
  public String getRecommendedExecutionMethodCode() { return recommendedExecutionMethodCode; }
  public String getRecommendedTestMethodCode() { return recommendedTestMethodCode; }
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
