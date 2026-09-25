package com.digiaudit.grcpc.modules.masterdata.coverage.requirementcontrol.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.coverage.requirementcontrol.domain.entity.CentralSubprocessRequirementControlCoverageEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralSubprocessRequirementControlCoverageRepository extends JpaRepository<CentralSubprocessRequirementControlCoverageEntity, UUID> {
  List<CentralSubprocessRequirementControlCoverageEntity> findBySubprocessIdAndStatusNot(UUID subprocessId, MasterDataLifecycleStatus status);
  List<CentralSubprocessRequirementControlCoverageEntity> findBySubprocessIdAndStatus(UUID subprocessId, MasterDataLifecycleStatus status);
  List<CentralSubprocessRequirementControlCoverageEntity> findByRequirementScopeIdAndStatusNot(UUID requirementScopeId, MasterDataLifecycleStatus status);
  List<CentralSubprocessRequirementControlCoverageEntity> findByControlScopeIdAndStatusNot(UUID controlScopeId, MasterDataLifecycleStatus status);
  List<CentralSubprocessRequirementControlCoverageEntity> findByRequirementScopeIdInAndStatusNot(List<UUID> requirementScopeIds, MasterDataLifecycleStatus status);
  List<CentralSubprocessRequirementControlCoverageEntity> findByControlScopeIdInAndStatusNot(List<UUID> controlScopeIds, MasterDataLifecycleStatus status);
  @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from CentralSubprocessRequirementControlCoverageEntity c where c.id in :ids order by c.requirementScopeId, c.controlScopeId, c.id")
  List<CentralSubprocessRequirementControlCoverageEntity> lockAllByIds(@Param("ids") List<UUID> ids);
  @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from CentralSubprocessRequirementControlCoverageEntity c where c.subprocessId = :subprocessId and c.requirementScopeId = :requirementScopeId and c.controlScopeId = :controlScopeId")
  Optional<CentralSubprocessRequirementControlCoverageEntity> lockByBusinessKey(@Param("subprocessId") UUID subprocessId, @Param("requirementScopeId") UUID requirementScopeId, @Param("controlScopeId") UUID controlScopeId);
}

