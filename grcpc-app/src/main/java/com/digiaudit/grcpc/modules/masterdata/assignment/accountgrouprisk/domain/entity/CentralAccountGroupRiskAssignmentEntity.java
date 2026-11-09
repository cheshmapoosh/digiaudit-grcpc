package com.digiaudit.grcpc.modules.masterdata.assignment.accountgrouprisk.domain.entity;

import com.digiaudit.grcpc.common.persistence.ProfileEntityListener;
import com.digiaudit.grcpc.common.persistence.ProfileScoped;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.infrastructure.persistence.MasterDataLifecycleStatusConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Getter
@Filter(name = "datasetProfile", condition = "profile_id = :profileId")
@EntityListeners(ProfileEntityListener.class)
@Table(name = "central_account_group_risk_assignment")
public class CentralAccountGroupRiskAssignmentEntity implements ProfileScoped {
  @Id
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "id", nullable = false, columnDefinition = "RAW(16)")
  private UUID id;

  @Setter
  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "profile_id", nullable = false, updatable = false, columnDefinition = "RAW(16)")
  private UUID profileId;

  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "account_group_id", nullable = false, updatable = false, columnDefinition = "RAW(16)")
  private UUID accountGroupId;

  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "risk_template_id", nullable = false, updatable = false, columnDefinition = "RAW(16)")
  private UUID riskTemplateId;

  @Convert(converter = MasterDataLifecycleStatusConverter.class)
  @Column(name = "status", nullable = false, length = 32)
  private MasterDataLifecycleStatus status;

  @Column(name = "valid_from")
  private LocalDate validFrom;

  @Column(name = "valid_to")
  private LocalDate validTo;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "created_by", nullable = false, columnDefinition = "RAW(16)")
  private UUID createdBy;

  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "updated_by", nullable = false, columnDefinition = "RAW(16)")
  private UUID updatedBy;

  @Column(name = "deleted_at")
  private Instant deletedAt;

  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "deleted_by", columnDefinition = "RAW(16)")
  private UUID deletedBy;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected CentralAccountGroupRiskAssignmentEntity() {}

  public static CentralAccountGroupRiskAssignmentEntity create(UUID accountGroupId, UUID riskTemplateId,
      UUID actorId, Instant now) {
    var row = new CentralAccountGroupRiskAssignmentEntity();
    row.id = UUID.randomUUID();
    row.accountGroupId = accountGroupId;
    row.riskTemplateId = riskTemplateId;
    row.createdAt = now;
    row.createdBy = actorId;
    row.changeStatus(MasterDataLifecycleStatus.ACTIVE, actorId, now);
    return row;
  }

  public void changeStatus(MasterDataLifecycleStatus next, UUID actorId, Instant now) {
    status = next;
    updatedAt = now;
    updatedBy = actorId;
    boolean deleted = next == MasterDataLifecycleStatus.DELETED;
    deletedAt = deleted ? now : null;
    deletedBy = deleted ? actorId : null;
  }
}
