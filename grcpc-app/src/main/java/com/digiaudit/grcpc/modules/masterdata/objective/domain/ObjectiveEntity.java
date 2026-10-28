package com.digiaudit.grcpc.modules.masterdata.objective.domain;

import com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@org.hibernate.annotations.Filter(name = "datasetProfile", condition = "profile_id = :profileId")
@Table(name = "objective")
@AttributeOverride(name = "title", column = @Column(name = "name", nullable = false, length = 255))
public class ObjectiveEntity extends CentralDefinitionEntity {
  @Enumerated(EnumType.STRING)
  @Column(name = "objective_kind", nullable = false, length = 32)
  private ObjectiveKind kind;

  @Column(name = "objective_type", length = 64)
  private String objectiveType;

  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "parent_objective_id", columnDefinition = "RAW(16)")
  private UUID parentObjectiveId;

  protected ObjectiveEntity() {}

  public ObjectiveEntity(UUID id, String code, String name, String description, String objectiveType,
      UUID parentObjectiveId, LocalDate validFrom, LocalDate validTo, UUID actor, Instant now) {
    this(id, code, name, description, objectiveType, parentObjectiveId, validFrom, validTo,
        actor, now, ObjectiveKind.OBJECTIVE);
  }

  public ObjectiveEntity(UUID id, String code, String name, String description, String objectiveType,
      UUID parentObjectiveId, LocalDate validFrom, LocalDate validTo, UUID actor, Instant now,
      ObjectiveKind kind) {
    super(id, code, name, description, validFrom, validTo, actor, now);
    this.kind = kind;
    this.objectiveType = objectiveType;
    this.parentObjectiveId = parentObjectiveId;
  }

  public void update(String name, String description, String objectiveType, UUID parentObjectiveId,
      LocalDate validFrom, LocalDate validTo, UUID actor, Instant now) {
    update(name, description, objectiveType, parentObjectiveId, validFrom, validTo, actor, now, kind);
  }

  public void update(String name, String description, String objectiveType, UUID parentObjectiveId,
      LocalDate validFrom, LocalDate validTo, UUID actor, Instant now, ObjectiveKind kind) {
    updateDefinition(name, description, validFrom, validTo, actor, now);
    this.kind = kind;
    this.objectiveType = objectiveType;
    this.parentObjectiveId = parentObjectiveId;
  }

  public void restore(UUID actor, Instant now, UUID parentObjectiveId) {
    restore(actor, now);
    this.parentObjectiveId = parentObjectiveId;
  }

  public String getName() { return getTitle(); }
  public ObjectiveKind getKind() { return kind; }
  public String getObjectiveType() { return objectiveType; }
  public UUID getParentObjectiveId() { return parentObjectiveId; }
}
