package com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.CentralPolicyType;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.PolicyCommunicationMethod;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "central_policy")
public class CentralPolicyEntity extends CentralDefinitionEntity {
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "policy_group_id", nullable = false, columnDefinition = "RAW(16)")
  private UUID policyGroupId;

  @Enumerated(EnumType.STRING)
  @Column(name = "policy_type", nullable = false, length = 32)
  private CentralPolicyType policyType;

  @Column(name = "responsible_organization", length = 255)
  private String responsibleOrganization;

  @Enumerated(EnumType.STRING)
  @Column(name = "communication_method", length = 32)
  private PolicyCommunicationMethod communicationMethod;

  @Column(name = "next_review_date")
  private LocalDate nextReviewDate;

  @Lob
  @Column(name = "objective", columnDefinition = "CLOB")
  private String objective;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  protected CentralPolicyEntity() {}

  private CentralPolicyEntity(
      UUID id,
      String code,
      String title,
      UUID policyGroupId,
      CentralPolicyType policyType,
      String responsibleOrganization,
      PolicyCommunicationMethod communicationMethod,
      LocalDate nextReviewDate,
      String objective,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    super(id, code, title, description, validFrom, validTo, actorId, now);
    this.policyGroupId = policyGroupId;
    this.policyType = policyType;
    this.responsibleOrganization = responsibleOrganization;
    this.communicationMethod = communicationMethod;
    this.nextReviewDate = nextReviewDate;
    this.objective = objective;
    this.sortOrder = sortOrder;
  }

  public static CentralPolicyEntity create(
      UUID id,
      String code,
      String title,
      UUID policyGroupId,
      CentralPolicyType policyType,
      String responsibleOrganization,
      PolicyCommunicationMethod communicationMethod,
      LocalDate nextReviewDate,
      String objective,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    return new CentralPolicyEntity(
        id,
        code,
        title,
        policyGroupId,
        policyType,
        responsibleOrganization,
        communicationMethod,
        nextReviewDate,
        objective,
        description,
        sortOrder,
        validFrom,
        validTo,
        actorId,
        now);
  }

  public void update(
      String title,
      CentralPolicyType policyType,
      String responsibleOrganization,
      PolicyCommunicationMethod communicationMethod,
      LocalDate nextReviewDate,
      String objective,
      String description,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    updateDefinition(title, description, validFrom, validTo, actorId, now);
    this.policyType = policyType;
    this.responsibleOrganization = responsibleOrganization;
    this.communicationMethod = communicationMethod;
    this.nextReviewDate = nextReviewDate;
    this.objective = objective;
  }

  public void move(UUID policyGroupId, int sortOrder, UUID actorId, Instant now) {
    requireNotDeleted();
    this.policyGroupId = policyGroupId;
    this.sortOrder = sortOrder;
    touch(actorId, now);
  }

  public void restoreFromCreate(
      String title,
      UUID policyGroupId,
      CentralPolicyType policyType,
      String responsibleOrganization,
      PolicyCommunicationMethod communicationMethod,
      LocalDate nextReviewDate,
      String objective,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    this.policyGroupId = policyGroupId;
    this.policyType = policyType;
    this.responsibleOrganization = responsibleOrganization;
    this.communicationMethod = communicationMethod;
    this.nextReviewDate = nextReviewDate;
    this.objective = objective;
    this.sortOrder = sortOrder;
    restoreDefinition(title, description, validFrom, validTo, actorId, now);
  }

  public void reactivateFromCreate(
      String title,
      UUID policyGroupId,
      CentralPolicyType policyType,
      String responsibleOrganization,
      PolicyCommunicationMethod communicationMethod,
      LocalDate nextReviewDate,
      String objective,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    this.policyGroupId = policyGroupId;
    this.policyType = policyType;
    this.responsibleOrganization = responsibleOrganization;
    this.communicationMethod = communicationMethod;
    this.nextReviewDate = nextReviewDate;
    this.objective = objective;
    this.sortOrder = sortOrder;
    reactivateDefinition(title, description, validFrom, validTo, actorId, now);
  }

  public UUID getPolicyGroupId() {
    return policyGroupId;
  }

  public CentralPolicyType getPolicyType() {
    return policyType;
  }

  public String getResponsibleOrganization() {
    return responsibleOrganization;
  }

  public PolicyCommunicationMethod getCommunicationMethod() {
    return communicationMethod;
  }

  public LocalDate getNextReviewDate() {
    return nextReviewDate;
  }

  public String getObjective() {
    return objective;
  }

  public int getSortOrder() {
    return sortOrder;
  }
}
