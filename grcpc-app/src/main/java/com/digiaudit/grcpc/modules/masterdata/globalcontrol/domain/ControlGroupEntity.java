package com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain;

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
@Table(name = "control_group")
@AttributeOverride(name = "title", column = @Column(name = "name", nullable = false, length = 255))
public class ControlGroupEntity extends CentralDefinitionEntity {
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "parent_id", columnDefinition = "RAW(16)")
  private UUID parentId;

  protected ControlGroupEntity() {}

  public ControlGroupEntity(UUID id, String code, String name, String description, UUID parentId,
      LocalDate validFrom, LocalDate validTo, UUID actor, Instant now) {
    super(id, code, name, description, validFrom, validTo, actor, now);
    this.parentId = parentId;
  }

  public void update(String name, String description, UUID parentId, LocalDate validFrom,
      LocalDate validTo, UUID actor, Instant now) {
    updateDefinition(name, description, validFrom, validTo, actor, now);
    this.parentId = parentId;
  }

  public String getName() { return getTitle(); }
  public UUID getParentId() { return parentId; }
}
