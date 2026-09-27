package com.digiaudit.grcpc.modules.masterdata.objective.domain;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.infrastructure.persistence.MasterDataLifecycleStatusConverter;
import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationEntity;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "organization_objective")
public class OrganizationObjectiveEntity {
  @Id @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
  private UUID id;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "organization_id", nullable = false, columnDefinition = "RAW(16)")
  private UUID organizationId;
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "objective_id", nullable = false, columnDefinition = "RAW(16)")
  private UUID objectiveId;
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "organization_id", insertable = false, updatable = false)
  private OrganizationEntity organization;
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "objective_id", insertable = false, updatable = false)
  private ObjectiveEntity objective;
  @Column(name = "name", nullable = false, length = 255)
  private String name;
  @Lob @Column(name = "description", columnDefinition = "CLOB")
  private String description;
  @Column(name = "owner", length = 255)
  private String owner;
  @Column(name = "valid_from")
  private LocalDate validFrom;
  @Column(name = "valid_to")
  private LocalDate validTo;
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
  @Version @Column(name = "version", nullable = false)
  private long version;

  protected OrganizationObjectiveEntity() {}

  public OrganizationObjectiveEntity(UUID id, UUID organizationId, UUID objectiveId, String name,
      String description, String owner, LocalDate validFrom, LocalDate validTo, UUID actor, Instant now) {
    this.id = id;
    this.organizationId = organizationId;
    this.objectiveId = objectiveId;
    this.name = name;
    this.description = description;
    this.owner = owner;
    this.validFrom = validFrom;
    this.validTo = validTo;
    this.status = MasterDataLifecycleStatus.ACTIVE;
    this.createdAt = now;
    this.updatedAt = now;
    this.createdBy = actor;
    this.updatedBy = actor;
  }

  public void update(String name, String description, String owner, LocalDate validFrom,
      LocalDate validTo, UUID actor, Instant now) {
    this.name = name;
    this.description = description;
    this.owner = owner;
    this.validFrom = validFrom;
    this.validTo = validTo;
    this.updatedBy = actor;
    this.updatedAt = now;
  }

  public void restore(String name, String description, String owner, LocalDate validFrom,
      LocalDate validTo, UUID actor, Instant now) {
    update(name, description, owner, validFrom, validTo, actor, now);
    this.status = MasterDataLifecycleStatus.ACTIVE;
    this.deletedAt = null;
    this.deletedBy = null;
  }

  public void delete(UUID actor, Instant now) {
    this.status = MasterDataLifecycleStatus.DELETED;
    this.deletedAt = now;
    this.deletedBy = actor;
    this.updatedAt = now;
    this.updatedBy = actor;
  }

  public UUID getId() { return id; }
  public UUID getOrganizationId() { return organizationId; }
  public UUID getObjectiveId() { return objectiveId; }
  public String getName() { return name; }
  public String getDescription() { return description; }
  public String getOwner() { return owner; }
  public LocalDate getValidFrom() { return validFrom; }
  public LocalDate getValidTo() { return validTo; }
  public MasterDataLifecycleStatus getStatus() { return status; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public long getVersion() { return version; }
}
