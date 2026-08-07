package com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  protected CentralAccountGroupEntity() {}

  private CentralAccountGroupEntity(
      UUID id,
      String code,
      String title,
      UUID parentAccountGroupId,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    super(id, code, title, description, validFrom, validTo, actorId, now);
    this.parentAccountGroupId = parentAccountGroupId;
    this.sortOrder = sortOrder;
  }

  public static CentralAccountGroupEntity create(
      UUID id,
      String code,
      String title,
      UUID parentAccountGroupId,
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
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    updateDefinition(title, description, validFrom, validTo, actorId, now);
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
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    this.parentAccountGroupId = parentAccountGroupId;
    this.sortOrder = sortOrder;
    restoreDefinition(title, description, validFrom, validTo, actorId, now);
  }

  public void reactivateFromCreate(
      String title,
      UUID parentAccountGroupId,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    this.parentAccountGroupId = parentAccountGroupId;
    this.sortOrder = sortOrder;
    reactivateDefinition(title, description, validFrom, validTo, actorId, now);
  }

  public UUID getParentAccountGroupId() {
    return parentAccountGroupId;
  }

  public int getSortOrder() {
    return sortOrder;
  }
}
