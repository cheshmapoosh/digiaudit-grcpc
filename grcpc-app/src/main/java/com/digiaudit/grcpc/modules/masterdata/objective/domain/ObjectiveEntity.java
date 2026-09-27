package com.digiaudit.grcpc.modules.masterdata.objective.domain;

import com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "objective")
@AttributeOverride(name = "title", column = @Column(name = "name", nullable = false, length = 255))
public class ObjectiveEntity extends CentralDefinitionEntity {
  @Column(name = "objective_type", length = 64)
  private String objectiveType;

  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "parent_objective_id", columnDefinition = "RAW(16)")
  private UUID parentObjectiveId;

  protected ObjectiveEntity() {}

  public ObjectiveEntity(UUID id, String code, String name, String description, String objectiveType,
      UUID parentObjectiveId, LocalDate validFrom, LocalDate validTo, UUID actor, Instant now) {
    super(id, code, name, description, validFrom, validTo, actor, now);
    this.objectiveType = objectiveType;
    this.parentObjectiveId = parentObjectiveId;
  }

  public void update(String name, String description, String objectiveType, UUID parentObjectiveId,
      LocalDate validFrom, LocalDate validTo, UUID actor, Instant now) {
    updateDefinition(name, description, validFrom, validTo, actor, now);
    this.objectiveType = objectiveType;
    this.parentObjectiveId = parentObjectiveId;
  }

  public String getName() { return getTitle(); }
  public String getObjectiveType() { return objectiveType; }
  public UUID getParentObjectiveId() { return parentObjectiveId; }
}
