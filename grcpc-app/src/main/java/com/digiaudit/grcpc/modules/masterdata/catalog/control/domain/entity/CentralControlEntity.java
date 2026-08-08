package com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlAutomationType;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlClass;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlImportance;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlPurpose;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "central_control")
public class CentralControlEntity extends CentralDefinitionEntity {
  @Enumerated(EnumType.STRING)
  @Column(name = "control_class", length = 32)
  private CentralControlClass controlClass;

  @Enumerated(EnumType.STRING)
  @Column(name = "importance", length = 32)
  private CentralControlImportance importance;

  @Enumerated(EnumType.STRING)
  @Column(name = "automation_type", length = 32)
  private CentralControlAutomationType automationType;

  @Enumerated(EnumType.STRING)
  @Column(name = "control_purpose", length = 32)
  private CentralControlPurpose controlPurpose;

  protected CentralControlEntity() {}

  private CentralControlEntity(
      UUID id,
      String code,
      String title,
      String description,
      CentralControlClass controlClass,
      CentralControlImportance importance,
      CentralControlAutomationType automationType,
      CentralControlPurpose controlPurpose,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    super(id, code, title, description, validFrom, validTo, actorId, now);
    this.controlClass = controlClass;
    this.importance = importance;
    this.automationType = automationType;
    this.controlPurpose = controlPurpose;
  }

  public static CentralControlEntity create(
      UUID id,
      String code,
      String title,
      String description,
      CentralControlClass controlClass,
      CentralControlImportance importance,
      CentralControlAutomationType automationType,
      CentralControlPurpose controlPurpose,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    return new CentralControlEntity(
        id,
        code,
        title,
        description,
        controlClass,
        importance,
        automationType,
        controlPurpose,
        validFrom,
        validTo,
        actorId,
        now);
  }

  public void update(
      String title,
      String description,
      CentralControlClass controlClass,
      CentralControlImportance importance,
      CentralControlAutomationType automationType,
      CentralControlPurpose controlPurpose,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    updateDefinition(title, description, validFrom, validTo, actorId, now);
    this.controlClass = controlClass;
    this.importance = importance;
    this.automationType = automationType;
    this.controlPurpose = controlPurpose;
  }

  public void restoreFromCreate(
      String title,
      String description,
      CentralControlClass controlClass,
      CentralControlImportance importance,
      CentralControlAutomationType automationType,
      CentralControlPurpose controlPurpose,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    restoreDefinition(title, description, validFrom, validTo, actorId, now);
    this.controlClass = controlClass;
    this.importance = importance;
    this.automationType = automationType;
    this.controlPurpose = controlPurpose;
  }

  public void reactivateFromCreate(
      String title,
      String description,
      CentralControlClass controlClass,
      CentralControlImportance importance,
      CentralControlAutomationType automationType,
      CentralControlPurpose controlPurpose,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    reactivateDefinition(title, description, validFrom, validTo, actorId, now);
    this.controlClass = controlClass;
    this.importance = importance;
    this.automationType = automationType;
    this.controlPurpose = controlPurpose;
  }

  public CentralControlClass getControlClass() {
    return controlClass;
  }

  public CentralControlImportance getImportance() {
    return importance;
  }

  public CentralControlAutomationType getAutomationType() {
    return automationType;
  }

  public CentralControlPurpose getControlPurpose() {
    return controlPurpose;
  }
}
