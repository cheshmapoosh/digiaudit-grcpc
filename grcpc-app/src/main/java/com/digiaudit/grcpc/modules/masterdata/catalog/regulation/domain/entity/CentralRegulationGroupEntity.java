package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity;

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
@Table(name = "central_regulation_group")
public class CentralRegulationGroupEntity extends CentralDefinitionEntity {
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "parent_group_id", columnDefinition = "RAW(16)")
  private UUID parentGroupId;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  protected CentralRegulationGroupEntity() {}

  private CentralRegulationGroupEntity(
      UUID id,
      String code,
      String title,
      UUID parentGroupId,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    super(id, code, title, description, validFrom, validTo, actorId, now);
    this.parentGroupId = parentGroupId;
    this.sortOrder = sortOrder;
  }

  public static CentralRegulationGroupEntity create(
      UUID id,
      String code,
      String title,
      UUID parentGroupId,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    return new CentralRegulationGroupEntity(
        id, code, title, parentGroupId, description, sortOrder, validFrom, validTo, actorId, now);
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

  public void move(UUID parentGroupId, int sortOrder, UUID actorId, Instant now) {
    requireNotDeleted();
    this.parentGroupId = parentGroupId;
    this.sortOrder = sortOrder;
    touch(actorId, now);
  }

  public void restoreFromCreate(
      String title,
      UUID parentGroupId,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    this.parentGroupId = parentGroupId;
    this.sortOrder = sortOrder;
    restoreDefinition(title, description, validFrom, validTo, actorId, now);
  }

  public void reactivateFromCreate(
      String title,
      UUID parentGroupId,
      String description,
      int sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      UUID actorId,
      Instant now) {
    this.parentGroupId = parentGroupId;
    this.sortOrder = sortOrder;
    reactivateDefinition(title, description, validFrom, validTo, actorId, now);
  }

  public UUID getParentGroupId() {
    return parentGroupId;
  }

  public int getSortOrder() {
    return sortOrder;
  }
}
