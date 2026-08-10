package com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.enums.CentralRiskType;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity;
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
@Table(name = "central_risk_template")
public class CentralRiskTemplateEntity extends CentralDefinitionEntity {
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "risk_category_id", nullable = false, columnDefinition = "RAW(16)")
  private UUID riskCategoryId;

  @Enumerated(EnumType.STRING)
  @Column(name = "risk_type", nullable = false, length = 32)
  private CentralRiskType riskType;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  protected CentralRiskTemplateEntity() {}

  private CentralRiskTemplateEntity(
      UUID id,
      String code,
      String title,
      UUID riskCategoryId,
      CentralRiskType riskType,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    super(id, code, title, description, validFrom, validTo, actorId, now);
    this.riskCategoryId = riskCategoryId;
    this.riskType = riskType;
    this.sortOrder = sortOrder;
  }

  public static CentralRiskTemplateEntity create(
      UUID id,
      String code,
      String title,
      UUID riskCategoryId,
      CentralRiskType riskType,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    return new CentralRiskTemplateEntity(
        id,
        code,
        title,
        riskCategoryId,
        riskType,
        description,
        sortOrder,
        validFrom,
        validTo,
        actorId,
        now);
  }

  public void update(
      String title,
      String description,
      CentralRiskType riskType,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    updateDefinition(title, description, validFrom, validTo, actorId, now);
    this.riskType = riskType;
  }

  public void move(UUID riskCategoryId, int sortOrder, UUID actorId, Instant now) {
    requireNotDeleted();
    this.riskCategoryId = riskCategoryId;
    this.sortOrder = sortOrder;
    touch(actorId, now);
  }

  public void restoreFromCreate(
      String title,
      UUID riskCategoryId,
      CentralRiskType riskType,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    this.riskCategoryId = riskCategoryId;
    this.riskType = riskType;
    this.sortOrder = sortOrder;
    restoreDefinition(title, description, validFrom, validTo, actorId, now);
  }

  public void reactivateFromCreate(
      String title,
      UUID riskCategoryId,
      CentralRiskType riskType,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    this.riskCategoryId = riskCategoryId;
    this.riskType = riskType;
    this.sortOrder = sortOrder;
    reactivateDefinition(title, description, validFrom, validTo, actorId, now);
  }

  public UUID getRiskCategoryId() {
    return riskCategoryId;
  }

  public CentralRiskType getRiskType() {
    return riskType;
  }

  public int getSortOrder() {
    return sortOrder;
  }
}
