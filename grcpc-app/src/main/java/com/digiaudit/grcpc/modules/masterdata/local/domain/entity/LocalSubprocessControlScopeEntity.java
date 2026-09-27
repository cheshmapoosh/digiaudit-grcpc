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
@Table(name = "local_subprocess_control_scope")
public class LocalSubprocessControlScopeEntity {
  @Id
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
  private UUID id;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "organization_subprocess_scope_id", nullable = false, columnDefinition = "RAW(16)", updatable = false)
  private UUID organizationSubprocessScopeId;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "control_id", nullable = false, columnDefinition = "RAW(16)", updatable = false)
  private UUID controlId;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "central_control_scope_id", columnDefinition = "RAW(16)", updatable = false)
  private UUID centralControlScopeId;
  @Enumerated(EnumType.STRING)
  @Column(name = "source_type", updatable = false, nullable = false)
  private LocalSourceType sourceType;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "actual_owner_id", columnDefinition = "RAW(16)")
  private UUID actualOwnerId;
  @Column(name = "frequency_code", length = 64)
  private String frequencyCode;
  @Column(name = "execution_method_code", length = 64)
  private String executionMethodCode;
  @Column(name = "test_method_code", length = 64)
  private String testMethodCode;
  @Column(name = "local_context_note", length = 1000)
  private String localContextNote;
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

  protected LocalSubprocessControlScopeEntity() {}

  private LocalSubprocessControlScopeEntity(UUID organizationSubprocessScopeId, UUID controlId, UUID centralControlScopeId, LocalSourceType sourceType, UUID actualOwnerId, String frequencyCode, String executionMethodCode, String testMethodCode, String localContextNote, LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
    this.id = UUID.randomUUID();
    this.organizationSubprocessScopeId = Objects.requireNonNull(organizationSubprocessScopeId);
    this.controlId = Objects.requireNonNull(controlId);
    this.centralControlScopeId = centralControlScopeId;
    this.sourceType = Objects.requireNonNull(sourceType);
    this.actualOwnerId = actualOwnerId;
    this.frequencyCode = frequencyCode;
    this.executionMethodCode = executionMethodCode;
    this.testMethodCode = testMethodCode;
    this.localContextNote = localContextNote;
    this.status = MasterDataLifecycleStatus.ACTIVE;
    this.validFrom = validFrom;
    this.validTo = validTo;
    this.createdAt = Objects.requireNonNull(now);
    this.updatedAt = now;
    this.createdBy = Objects.requireNonNull(actorId);
    this.updatedBy = actorId;
    this.version = 0L;
  }

  public static LocalSubprocessControlScopeEntity create(UUID organizationSubprocessScopeId, UUID controlId, UUID centralControlScopeId, LocalSourceType sourceType, UUID actualOwnerId, String frequencyCode, String executionMethodCode, String testMethodCode, String localContextNote, LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
    return new LocalSubprocessControlScopeEntity(organizationSubprocessScopeId, controlId, centralControlScopeId, sourceType, actualOwnerId, frequencyCode, executionMethodCode, testMethodCode, localContextNote, validFrom, validTo, actorId, now);
  }

  public void update(UUID actualOwnerId, String frequencyCode, String executionMethodCode, String testMethodCode, String localContextNote, LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
    if (status == MasterDataLifecycleStatus.DELETED) throw new IllegalStateException("Deleted Local row");
    this.actualOwnerId = actualOwnerId;
    this.frequencyCode = frequencyCode;
    this.executionMethodCode = executionMethodCode;
    this.testMethodCode = testMethodCode;
    this.localContextNote = localContextNote;
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
  public UUID getControlId() { return controlId; }
  public UUID getCentralControlScopeId() { return centralControlScopeId; }
  public LocalSourceType getSourceType() { return sourceType; }
  public UUID getActualOwnerId() { return actualOwnerId; }
  public String getFrequencyCode() { return frequencyCode; }
  public String getExecutionMethodCode() { return executionMethodCode; }
  public String getTestMethodCode() { return testMethodCode; }
  public String getLocalContextNote() { return localContextNote; }
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

