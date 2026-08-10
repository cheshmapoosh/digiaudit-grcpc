package com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "central_control_objective")
public class CentralControlObjectiveEntity extends CentralDefinitionEntity {
  @Column(name = "objective_class", length = 255)
  private String objectiveClass;

  protected CentralControlObjectiveEntity() {}

  private CentralControlObjectiveEntity(
      UUID id,
      String code,
      String title,
      String description,
      String objectiveClass,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    super(id, code, title, description, validFrom, validTo, actorId, now);
    this.objectiveClass = objectiveClass;
  }

  public static CentralControlObjectiveEntity create(
      UUID id,
      String code,
      String title,
      String description,
      String objectiveClass,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    return new CentralControlObjectiveEntity(
        id, code, title, description, objectiveClass, validFrom, validTo, actorId, now);
  }

  public void update(
      String title,
      String description,
      String objectiveClass,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    updateDefinition(title, description, validFrom, validTo, actorId, now);
    this.objectiveClass = objectiveClass;
  }

  public void restoreFromCreate(
      String title,
      String description,
      String objectiveClass,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    restoreDefinition(title, description, validFrom, validTo, actorId, now);
    this.objectiveClass = objectiveClass;
  }

  public void reactivateFromCreate(
      String title,
      String description,
      String objectiveClass,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    reactivateDefinition(title, description, validFrom, validTo, actorId, now);
    this.objectiveClass = objectiveClass;
  }

  public String getObjectiveClass() {
    return objectiveClass;
  }
}
