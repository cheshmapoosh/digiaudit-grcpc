package com.digiaudit.grcpc.modules.masterdata.coverage.controlcontrolobjective.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.infrastructure.persistence.MasterDataLifecycleStatusConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "central_subprocess_control_control_objective_coverage")
public class CentralSubprocessControlControlObjectiveCoverageEntity {
  @Id @JdbcTypeCode(SqlTypes.BINARY) @Column(name = "id", nullable = false, columnDefinition = "RAW(16)") private UUID id;
  @JdbcTypeCode(SqlTypes.BINARY) @Column(name = "subprocess_id", nullable = false, updatable = false, columnDefinition = "RAW(16)") private UUID subprocessId;
  @JdbcTypeCode(SqlTypes.BINARY) @Column(name = "control_scope_id", nullable = false, updatable = false, columnDefinition = "RAW(16)") private UUID controlScopeId;
  @JdbcTypeCode(SqlTypes.BINARY) @Column(name = "control_objective_scope_id", nullable = false, updatable = false, columnDefinition = "RAW(16)") private UUID controlObjectiveScopeId;
  @Convert(converter = MasterDataLifecycleStatusConverter.class) @Column(name = "status", nullable = false, length = 32) private MasterDataLifecycleStatus status;
  @Column(name = "valid_from") private LocalDate validFrom; @Column(name = "valid_to") private LocalDate validTo;
  @Column(name = "created_at", nullable = false) private Instant createdAt; @Column(name = "updated_at", nullable = false) private Instant updatedAt;
  @JdbcTypeCode(SqlTypes.BINARY) @Column(name = "created_by", nullable = false, columnDefinition = "RAW(16)") private UUID createdBy;
  @JdbcTypeCode(SqlTypes.BINARY) @Column(name = "updated_by", nullable = false, columnDefinition = "RAW(16)") private UUID updatedBy;
  @Column(name = "deleted_at") private Instant deletedAt; @JdbcTypeCode(SqlTypes.BINARY) @Column(name = "deleted_by", columnDefinition = "RAW(16)") private UUID deletedBy;
  @Version @Column(name = "version", nullable = false) private long version;
  protected CentralSubprocessControlControlObjectiveCoverageEntity() {}
  private CentralSubprocessControlControlObjectiveCoverageEntity(UUID id, UUID subprocessId, UUID controlScopeId, UUID controlObjectiveScopeId, LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) { this.id=Objects.requireNonNull(id); this.subprocessId=Objects.requireNonNull(subprocessId); this.controlScopeId=Objects.requireNonNull(controlScopeId); this.controlObjectiveScopeId=Objects.requireNonNull(controlObjectiveScopeId); status=MasterDataLifecycleStatus.ACTIVE; this.validFrom=validFrom; this.validTo=validTo; createdAt=Objects.requireNonNull(now); updatedAt=now; createdBy=Objects.requireNonNull(actorId); updatedBy=actorId; }
  public static CentralSubprocessControlControlObjectiveCoverageEntity create(UUID id, UUID subprocessId, UUID controlScopeId, UUID controlObjectiveScopeId, LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) { return new CentralSubprocessControlControlObjectiveCoverageEntity(id,subprocessId,controlScopeId,controlObjectiveScopeId,validFrom,validTo,actorId,now); }
  public void update(LocalDate from, LocalDate to, UUID actor, Instant now){requireNotDeleted();validFrom=from;validTo=to;touch(actor,now);} public void reactivateFromCreate(LocalDate from,LocalDate to,UUID actor,Instant now){requireStatus(MasterDataLifecycleStatus.INACTIVE);validFrom=from;validTo=to;status=MasterDataLifecycleStatus.ACTIVE;touch(actor,now);} public void restoreFromCreate(LocalDate from,LocalDate to,UUID actor,Instant now){requireStatus(MasterDataLifecycleStatus.DELETED);validFrom=from;validTo=to;restore(actor,now);} public void activate(UUID actor,Instant now){requireStatus(MasterDataLifecycleStatus.INACTIVE);status=MasterDataLifecycleStatus.ACTIVE;touch(actor,now);} public void inactivate(UUID actor,Instant now){requireStatus(MasterDataLifecycleStatus.ACTIVE);status=MasterDataLifecycleStatus.INACTIVE;touch(actor,now);} public void delete(UUID actor,Instant now){if(status==MasterDataLifecycleStatus.DELETED)throw new IllegalStateException("Coverage already deleted");status=MasterDataLifecycleStatus.DELETED;deletedAt=Objects.requireNonNull(now);deletedBy=Objects.requireNonNull(actor);touch(actor,now);} public void restore(UUID actor,Instant now){requireStatus(MasterDataLifecycleStatus.DELETED);status=MasterDataLifecycleStatus.ACTIVE;deletedAt=null;deletedBy=null;touch(actor,now);} private void requireNotDeleted(){if(status==MasterDataLifecycleStatus.DELETED)throw new IllegalStateException("Deleted coverage cannot be updated");} private void requireStatus(MasterDataLifecycleStatus required){if(status!=required)throw new IllegalStateException("Invalid coverage lifecycle transition");} private void touch(UUID actor,Instant now){updatedBy=Objects.requireNonNull(actor);updatedAt=Objects.requireNonNull(now);}
  public UUID getId(){return id;} public UUID getSubprocessId(){return subprocessId;} public UUID getControlScopeId(){return controlScopeId;} public UUID getControlObjectiveScopeId(){return controlObjectiveScopeId;} public MasterDataLifecycleStatus getStatus(){return status;} public LocalDate getValidFrom(){return validFrom;} public LocalDate getValidTo(){return validTo;} public Instant getCreatedAt(){return createdAt;} public Instant getUpdatedAt(){return updatedAt;} public UUID getCreatedBy(){return createdBy;} public UUID getUpdatedBy(){return updatedBy;} public Instant getDeletedAt(){return deletedAt;} public UUID getDeletedBy(){return deletedBy;} public long getVersion(){return version;}
}
