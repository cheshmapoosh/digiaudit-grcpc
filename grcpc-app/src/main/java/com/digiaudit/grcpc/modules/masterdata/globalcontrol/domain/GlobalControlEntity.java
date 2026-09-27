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
@Table(name = "global_control")
@AttributeOverride(name = "title", column = @Column(name = "name", nullable = false, length = 255))
public class GlobalControlEntity extends CentralDefinitionEntity {
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "control_group_id", nullable = false, columnDefinition = "RAW(16)")
  private UUID controlGroupId;

  @Column(name = "control_type", nullable = false, length = 64)
  private String controlType;

  @Column(name = "test_required", nullable = false)
  private Boolean testRequired;

  protected GlobalControlEntity() {}

  public GlobalControlEntity(UUID id, String code, String name, String description,
      UUID controlGroupId, String controlType, boolean testRequired, LocalDate validFrom,
      LocalDate validTo, UUID actor, Instant now) {
    super(id, code, name, description, validFrom, validTo, actor, now);
    this.controlGroupId = controlGroupId;
    this.controlType = controlType;
    this.testRequired = testRequired;
  }

  public void update(String name, String description, UUID controlGroupId, String controlType,
      boolean testRequired, LocalDate validFrom, LocalDate validTo, UUID actor, Instant now) {
    updateDefinition(name, description, validFrom, validTo, actor, now);
    this.controlGroupId = controlGroupId;
    this.controlType = controlType;
    this.testRequired = testRequired;
  }

  public String getName() { return getTitle(); }
  public UUID getControlGroupId() { return controlGroupId; }
  public String getControlType() { return controlType; }
  public Boolean getTestRequired() { return testRequired; }
}
