package com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain;

import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.infrastructure.persistence.MasterDataLifecycleStatusConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "global_control_regulation")
public class GlobalControlRegulationEntity {
  @Id
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
  private UUID id;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "global_control_id", nullable = false, columnDefinition = "RAW(16)")
  private UUID globalControlId;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "regulation_id", nullable = false, columnDefinition = "RAW(16)")
  private UUID regulationId;
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "global_control_id", insertable = false, updatable = false)
  private GlobalControlEntity globalControl;
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "regulation_id", insertable = false, updatable = false)
  private CentralRegulationEntity regulation;
  @Convert(converter = MasterDataLifecycleStatusConverter.class)
  @Column(name = "status", nullable = false, length = 32)
  private MasterDataLifecycleStatus status;
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

  protected GlobalControlRegulationEntity() {}

  public GlobalControlRegulationEntity(UUID id, UUID globalControlId, UUID regulationId,
      UUID actor, Instant now) {
    this.id = id;
    this.globalControlId = globalControlId;
    this.regulationId = regulationId;
    this.status = MasterDataLifecycleStatus.ACTIVE;
    this.createdAt = now;
    this.updatedAt = now;
    this.createdBy = actor;
    this.updatedBy = actor;
  }

  public void restore(UUID actor, Instant now) {
    this.status = MasterDataLifecycleStatus.ACTIVE;
    this.deletedAt = null;
    this.deletedBy = null;
    this.updatedAt = now;
    this.updatedBy = actor;
  }

  public void delete(UUID actor, Instant now) {
    this.status = MasterDataLifecycleStatus.DELETED;
    this.deletedAt = now;
    this.deletedBy = actor;
    this.updatedAt = now;
    this.updatedBy = actor;
  }

  public UUID getId() { return id; }
  public UUID getGlobalControlId() { return globalControlId; }
  public UUID getRegulationId() { return regulationId; }
  public MasterDataLifecycleStatus getStatus() { return status; }
  public long getVersion() { return version; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
}
