package com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.enums.CentralAccountGroupImportance;
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
@Table(name = "central_account_group")
public class CentralAccountGroupEntity extends CentralDefinitionEntity {
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "parent_account_group_id", columnDefinition = "RAW(16)")
  private UUID parentAccountGroupId;

  @Enumerated(EnumType.STRING)
  @Column(name = "importance", nullable = false, length = 32)
  private CentralAccountGroupImportance importance;

  @Column(name = "reasonable_assurance", nullable = false)
  private boolean reasonableAssurance;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  protected CentralAccountGroupEntity() {}

  private CentralAccountGroupEntity(
      UUID id,
      String code,
      String title,
      UUID parentAccountGroupId,
      CentralAccountGroupImportance importance,
      boolean reasonableAssurance,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    super(id, code, title, description, validFrom, validTo, actorId, now);
    this.parentAccountGroupId = parentAccountGroupId;
    this.importance = importance;
    this.reasonableAssurance = reasonableAssurance;
    this.sortOrder = sortOrder;
  }

  public static CentralAccountGroupEntity create(
      UUID id,
      String code,
      String title,
      UUID parentAccountGroupId,
      CentralAccountGroupImportance importance,
      boolean reasonableAssurance,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    return new CentralAccountGroupEntity(
        id,
        code,
        title,
        parentAccountGroupId,
        importance,
        reasonableAssurance,
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
      CentralAccountGroupImportance importance,
      boolean reasonableAssurance,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    updateDefinition(title, description, validFrom, validTo, actorId, now);
    this.importance = importance;
    this.reasonableAssurance = reasonableAssurance;
  }

  public void move(UUID parentAccountGroupId, int sortOrder, UUID actorId, Instant now) {
    requireNotDeleted();
    this.parentAccountGroupId = parentAccountGroupId;
    this.sortOrder = sortOrder;
    touch(actorId, now);
  }

  public void restoreFromCreate(
      String title,
      UUID parentAccountGroupId,
      CentralAccountGroupImportance importance,
      boolean reasonableAssurance,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    this.parentAccountGroupId = parentAccountGroupId;
    this.importance = importance;
    this.reasonableAssurance = reasonableAssurance;
    this.sortOrder = sortOrder;
    restoreDefinition(title, description, validFrom, validTo, actorId, now);
  }

  public void reactivateFromCreate(
      String title,
      UUID parentAccountGroupId,
      CentralAccountGroupImportance importance,
      boolean reasonableAssurance,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    this.parentAccountGroupId = parentAccountGroupId;
    this.importance = importance;
    this.reasonableAssurance = reasonableAssurance;
    this.sortOrder = sortOrder;
    reactivateDefinition(title, description, validFrom, validTo, actorId, now);
  }

  public UUID getParentAccountGroupId() {
    return parentAccountGroupId;
  }

  public CentralAccountGroupImportance getImportance() {
    return importance;
  }

  public boolean isReasonableAssurance() {
    return reasonableAssurance;
  }

  public int getSortOrder() {
    return sortOrder;
  }
}
