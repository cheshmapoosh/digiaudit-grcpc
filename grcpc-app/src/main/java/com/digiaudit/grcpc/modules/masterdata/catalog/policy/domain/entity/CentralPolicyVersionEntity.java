package com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.PolicyVersionStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.infrastructure.persistence.MasterDataLifecycleStatusConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "central_policy_version")
public class CentralPolicyVersionEntity {
  @Id
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
  private UUID id;

  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "policy_id", nullable = false, columnDefinition = "RAW(16)")
  private UUID policyId;

  @Column(name = "version_number", nullable = false)
  private int versionNumber;

  @Lob
  @Column(name = "content", columnDefinition = "CLOB")
  private String content;

  @Enumerated(EnumType.STRING)
  @Column(name = "version_status", nullable = false, length = 32)
  private PolicyVersionStatus versionStatus;

  @Column(name = "published_at")
  private Instant publishedAt;

  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "published_by", columnDefinition = "RAW(16)")
  private UUID publishedBy;

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

  protected CentralPolicyVersionEntity() {}

  private CentralPolicyVersionEntity(
      UUID id,
      UUID policyId,
      int versionNumber,
      String content,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    this.id = Objects.requireNonNull(id, "id is required");
    this.policyId = Objects.requireNonNull(policyId, "policyId is required");
    this.versionNumber = versionNumber;
    this.content = content;
    this.versionStatus = PolicyVersionStatus.DRAFT;
    this.status = MasterDataLifecycleStatus.ACTIVE;
    this.validFrom = validFrom;
    this.validTo = validTo;
    this.createdAt = Objects.requireNonNull(now, "now is required");
    this.createdBy = Objects.requireNonNull(actorId, "actorId is required");
    this.updatedAt = now;
    this.updatedBy = actorId;
    this.version = 0L;
  }

  public static CentralPolicyVersionEntity createDraft(
      UUID id,
      UUID policyId,
      int versionNumber,
      String content,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    return new CentralPolicyVersionEntity(
        id, policyId, versionNumber, content, validFrom, validTo, actorId, now);
  }

  public static CentralPolicyVersionEntity createPublishedBaseline(
      UUID id,
      UUID policyId,
      int versionNumber,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    CentralPolicyVersionEntity baseline =
        new CentralPolicyVersionEntity(
            id, policyId, versionNumber, null, validFrom, validTo, actorId, now);
    baseline.versionStatus = PolicyVersionStatus.PUBLISHED;
    baseline.publishedAt = now;
    baseline.publishedBy = actorId;
    return baseline;
  }

  public void updateDraft(
      String content, LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
    requireDraft();
    this.content = content;
    this.validFrom = validFrom;
    this.validTo = validTo;
    touch(actorId, now);
  }

  public void publish(UUID actorId, Instant now) {
    requireDraft();
    if (content == null || content.isBlank()) {
      throw new IllegalStateException("A policy version requires content before publication");
    }
    versionStatus = PolicyVersionStatus.PUBLISHED;
    publishedAt = Objects.requireNonNull(now, "now is required");
    publishedBy = Objects.requireNonNull(actorId, "actorId is required");
    touch(actorId, now);
  }

  public void supersede(UUID actorId, Instant now) {
    if (versionStatus != PolicyVersionStatus.PUBLISHED) {
      throw new IllegalStateException("Only a published policy version can be superseded");
    }
    versionStatus = PolicyVersionStatus.SUPERSEDED;
    touch(actorId, now);
  }

  public void deleteDraft(UUID actorId, Instant now) {
    requireDraft();
    status = MasterDataLifecycleStatus.DELETED;
    deletedAt = Objects.requireNonNull(now, "now is required");
    deletedBy = Objects.requireNonNull(actorId, "actorId is required");
    touch(actorId, now);
  }

  public void restoreDraft(UUID actorId, Instant now) {
    if (versionStatus != PolicyVersionStatus.DRAFT || status != MasterDataLifecycleStatus.DELETED) {
      throw new IllegalStateException("Only a deleted draft policy version can be restored");
    }
    status = MasterDataLifecycleStatus.ACTIVE;
    deletedAt = null;
    deletedBy = null;
    touch(actorId, now);
  }

  public void requireDraft() {
    if (versionStatus != PolicyVersionStatus.DRAFT || status == MasterDataLifecycleStatus.DELETED) {
      throw new IllegalStateException("Published and superseded policy versions are immutable");
    }
  }

  private void touch(UUID actorId, Instant now) {
    updatedBy = Objects.requireNonNull(actorId, "actorId is required");
    updatedAt = Objects.requireNonNull(now, "now is required");
  }

  public UUID getId() {
    return id;
  }

  public UUID getPolicyId() {
    return policyId;
  }

  public int getVersionNumber() {
    return versionNumber;
  }

  public String getContent() {
    return content;
  }

  public PolicyVersionStatus getVersionStatus() {
    return versionStatus;
  }

  public Instant getPublishedAt() {
    return publishedAt;
  }

  public UUID getPublishedBy() {
    return publishedBy;
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

  public UUID getCreatedBy() {
    return createdBy;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
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
