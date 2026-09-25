package com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.domain.entity.CentralSubprocessRiskControlCoverageEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralSubprocessRiskControlCoverageRepository extends JpaRepository<CentralSubprocessRiskControlCoverageEntity, UUID> {
  List<CentralSubprocessRiskControlCoverageEntity> findBySubprocessIdAndStatusNot(UUID subprocessId, MasterDataLifecycleStatus status);
  List<CentralSubprocessRiskControlCoverageEntity> findBySubprocessIdAndStatus(UUID subprocessId, MasterDataLifecycleStatus status);
  List<CentralSubprocessRiskControlCoverageEntity> findByRiskScopeIdAndStatusNot(UUID riskScopeId, MasterDataLifecycleStatus status);
  List<CentralSubprocessRiskControlCoverageEntity> findByControlScopeIdAndStatusNot(UUID controlScopeId, MasterDataLifecycleStatus status);
  List<CentralSubprocessRiskControlCoverageEntity> findByRiskScopeIdInAndStatusNot(List<UUID> riskScopeIds, MasterDataLifecycleStatus status);
  List<CentralSubprocessRiskControlCoverageEntity> findByControlScopeIdInAndStatusNot(List<UUID> controlScopeIds, MasterDataLifecycleStatus status);
  @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from CentralSubprocessRiskControlCoverageEntity c where c.id in :ids order by c.riskScopeId, c.controlScopeId, c.id")
  List<CentralSubprocessRiskControlCoverageEntity> lockAllByIds(@Param("ids") List<UUID> ids);
  @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from CentralSubprocessRiskControlCoverageEntity c where c.subprocessId = :subprocessId and c.riskScopeId = :riskScopeId and c.controlScopeId = :controlScopeId")
  Optional<CentralSubprocessRiskControlCoverageEntity> lockByBusinessKey(@Param("subprocessId") UUID subprocessId, @Param("riskScopeId") UUID riskScopeId, @Param("controlScopeId") UUID controlScopeId);
}
