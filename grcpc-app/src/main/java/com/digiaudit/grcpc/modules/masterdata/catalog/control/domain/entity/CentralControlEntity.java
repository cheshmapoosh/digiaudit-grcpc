package com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.converter.CentralControlRelevanceConverter;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "central_control")
public class CentralControlEntity extends CentralDefinitionEntity {
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "control_group_id", columnDefinition = "RAW(16)")
  private UUID controlGroupId;

  @Enumerated(EnumType.STRING)
  @Column(name = "control_class", length = 32)
  private CentralControlClass controlClass;

  @Enumerated(EnumType.STRING)
  @Column(name = "importance", length = 32)
  private CentralControlImportance importance;

  @Enumerated(EnumType.STRING)
  @Column(name = "control_risk", length = 32)
  private CentralControlRisk controlRisk;

  @Enumerated(EnumType.STRING)
  @Column(name = "automation_type", length = 32)
  private CentralControlAutomationType automationType;

  @Enumerated(EnumType.STRING)
  @Column(name = "control_purpose", length = 32)
  private CentralControlPurpose controlPurpose;

  @Enumerated(EnumType.STRING)
  @Column(name = "nature", length = 32)
  private CentralControlNature nature;

  @Convert(converter = CentralControlRelevanceConverter.class)
  @Column(name = "control_relevance", length = 1000)
  private Set<CentralControlRelevance> controlRelevance = EnumSet.noneOf(CentralControlRelevance.class);

  @Enumerated(EnumType.STRING)
  @Column(name = "trigger_type", length = 32)
  private CentralControlTriggerType triggerType;

  @Column(name = "event_description", length = 1000)
  private String eventDescription;

  @Enumerated(EnumType.STRING)
  @Column(name = "operation_frequency", length = 32)
  private CentralControlOperationFrequency operationFrequency;

  @Column(name = "to_be_tested")
  private Boolean toBeTested;

  @Enumerated(EnumType.STRING)
  @Column(name = "test_automation_type", length = 32)
  private CentralControlTestAutomationType testAutomationType;

  @Enumerated(EnumType.STRING)
  @Column(name = "testing_technique", length = 64)
  private CentralControlTestingTechnique testingTechnique;

  @Enumerated(EnumType.STRING)
  @Column(name = "evidence_level", length = 64)
  private CentralControlEvidenceLevel evidenceLevel;

  protected CentralControlEntity() {}

  private CentralControlEntity(
      UUID id,
      String code,
      String title,
      String description,
      UUID controlGroupId,
      CentralControlClass controlClass,
      CentralControlImportance importance,
      CentralControlRisk controlRisk,
      CentralControlAutomationType automationType,
      CentralControlPurpose controlPurpose,
      CentralControlNature nature,
      Set<CentralControlRelevance> controlRelevance,
      CentralControlTriggerType triggerType,
      String eventDescription,
      CentralControlOperationFrequency operationFrequency,
      Boolean toBeTested,
      CentralControlTestAutomationType testAutomationType,
      CentralControlTestingTechnique testingTechnique,
      CentralControlEvidenceLevel evidenceLevel,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    super(id, code, title, description, validFrom, validTo, actorId, now);
    applyFields(
        controlGroupId,
        controlClass,
        importance,
        controlRisk,
        automationType,
        controlPurpose,
        nature,
        controlRelevance,
        triggerType,
        eventDescription,
        operationFrequency,
        toBeTested,
        testAutomationType,
        testingTechnique,
        evidenceLevel);
  }

  public static CentralControlEntity create(
      UUID id,
      String code,
      String title,
      String description,
      UUID controlGroupId,
      CentralControlClass controlClass,
      CentralControlImportance importance,
      CentralControlRisk controlRisk,
      CentralControlAutomationType automationType,
      CentralControlPurpose controlPurpose,
      CentralControlNature nature,
      Set<CentralControlRelevance> controlRelevance,
      CentralControlTriggerType triggerType,
      String eventDescription,
      CentralControlOperationFrequency operationFrequency,
      Boolean toBeTested,
      CentralControlTestAutomationType testAutomationType,
      CentralControlTestingTechnique testingTechnique,
      CentralControlEvidenceLevel evidenceLevel,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    return new CentralControlEntity(
        id,
        code,
        title,
        description,
        controlGroupId,
        controlClass,
        importance,
        controlRisk,
        automationType,
        controlPurpose,
        nature,
        controlRelevance,
        triggerType,
        eventDescription,
        operationFrequency,
        toBeTested,
        testAutomationType,
        testingTechnique,
        evidenceLevel,
        validFrom,
        validTo,
        actorId,
        now);
  }

  public void update(
      String title,
      String description,
      UUID controlGroupId,
      CentralControlClass controlClass,
      CentralControlImportance importance,
      CentralControlRisk controlRisk,
      CentralControlAutomationType automationType,
      CentralControlPurpose controlPurpose,
      CentralControlNature nature,
      Set<CentralControlRelevance> controlRelevance,
      CentralControlTriggerType triggerType,
      String eventDescription,
      CentralControlOperationFrequency operationFrequency,
      Boolean toBeTested,
      CentralControlTestAutomationType testAutomationType,
      CentralControlTestingTechnique testingTechnique,
      CentralControlEvidenceLevel evidenceLevel,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    updateDefinition(title, description, validFrom, validTo, actorId, now);
    applyFields(
        controlGroupId,
        controlClass,
        importance,
        controlRisk,
        automationType,
        controlPurpose,
        nature,
        controlRelevance,
        triggerType,
        eventDescription,
        operationFrequency,
        toBeTested,
        testAutomationType,
        testingTechnique,
        evidenceLevel);
  }

  public void restoreFromCreate(
      String title,
      String description,
      UUID controlGroupId,
      CentralControlClass controlClass,
      CentralControlImportance importance,
      CentralControlRisk controlRisk,
      CentralControlAutomationType automationType,
      CentralControlPurpose controlPurpose,
      CentralControlNature nature,
      Set<CentralControlRelevance> controlRelevance,
      CentralControlTriggerType triggerType,
      String eventDescription,
      CentralControlOperationFrequency operationFrequency,
      Boolean toBeTested,
      CentralControlTestAutomationType testAutomationType,
      CentralControlTestingTechnique testingTechnique,
      CentralControlEvidenceLevel evidenceLevel,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    restoreDefinition(title, description, validFrom, validTo, actorId, now);
    applyFields(
        controlGroupId,
        controlClass,
        importance,
        controlRisk,
        automationType,
        controlPurpose,
        nature,
        controlRelevance,
        triggerType,
        eventDescription,
        operationFrequency,
        toBeTested,
        testAutomationType,
        testingTechnique,
        evidenceLevel);
  }

  public void reactivateFromCreate(
      String title,
      String description,
      UUID controlGroupId,
      CentralControlClass controlClass,
      CentralControlImportance importance,
      CentralControlRisk controlRisk,
      CentralControlAutomationType automationType,
      CentralControlPurpose controlPurpose,
      CentralControlNature nature,
      Set<CentralControlRelevance> controlRelevance,
      CentralControlTriggerType triggerType,
      String eventDescription,
      CentralControlOperationFrequency operationFrequency,
      Boolean toBeTested,
      CentralControlTestAutomationType testAutomationType,
      CentralControlTestingTechnique testingTechnique,
      CentralControlEvidenceLevel evidenceLevel,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    reactivateDefinition(title, description, validFrom, validTo, actorId, now);
    applyFields(
        controlGroupId,
        controlClass,
        importance,
        controlRisk,
        automationType,
        controlPurpose,
        nature,
        controlRelevance,
        triggerType,
        eventDescription,
        operationFrequency,
        toBeTested,
        testAutomationType,
        testingTechnique,
        evidenceLevel);
  }

  private void applyFields(
      UUID controlGroupId,
      CentralControlClass controlClass,
      CentralControlImportance importance,
      CentralControlRisk controlRisk,
      CentralControlAutomationType automationType,
      CentralControlPurpose controlPurpose,
      CentralControlNature nature,
      Set<CentralControlRelevance> controlRelevance,
      CentralControlTriggerType triggerType,
      String eventDescription,
      CentralControlOperationFrequency operationFrequency,
      Boolean toBeTested,
      CentralControlTestAutomationType testAutomationType,
      CentralControlTestingTechnique testingTechnique,
      CentralControlEvidenceLevel evidenceLevel) {
    this.controlGroupId = controlGroupId;
    this.controlClass = controlClass;
    this.importance = importance;
    this.controlRisk = controlRisk;
    this.automationType = automationType;
    this.controlPurpose = controlPurpose;
    this.nature = nature;
    this.controlRelevance = copy(controlRelevance);
    this.triggerType = triggerType;
    this.eventDescription = triggerType == CentralControlTriggerType.EVENT ? eventDescription : null;
    this.operationFrequency = triggerType == CentralControlTriggerType.DATE ? operationFrequency : null;
    this.toBeTested = toBeTested;
    this.testAutomationType = testAutomationType;
    this.testingTechnique = testingTechnique;
    this.evidenceLevel = evidenceLevel;
  }

  private static Set<CentralControlRelevance> copy(Set<CentralControlRelevance> values) {
    return values == null || values.isEmpty()
        ? EnumSet.noneOf(CentralControlRelevance.class)
        : EnumSet.copyOf(values);
  }

  public UUID getControlGroupId() { return controlGroupId; }
  public CentralControlClass getControlClass() { return controlClass; }
  public CentralControlImportance getImportance() { return importance; }
  public CentralControlRisk getControlRisk() { return controlRisk; }
  public CentralControlAutomationType getAutomationType() { return automationType; }
  public CentralControlPurpose getControlPurpose() { return controlPurpose; }
  public CentralControlNature getNature() { return nature; }
  public Set<CentralControlRelevance> getControlRelevance() { return Set.copyOf(controlRelevance); }
  public CentralControlTriggerType getTriggerType() { return triggerType; }
  public String getEventDescription() { return eventDescription; }
  public CentralControlOperationFrequency getOperationFrequency() { return operationFrequency; }
  public Boolean getToBeTested() { return toBeTested; }
  public CentralControlTestAutomationType getTestAutomationType() { return testAutomationType; }
  public CentralControlTestingTechnique getTestingTechnique() { return testingTechnique; }
  public CentralControlEvidenceLevel getEvidenceLevel() { return evidenceLevel; }
}
