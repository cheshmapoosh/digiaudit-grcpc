package com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.domain.entity.CentralSubprocessRiskControlObjectiveCoverageEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralSubprocessRiskControlObjectiveCoverageRepository extends JpaRepository<CentralSubprocessRiskControlObjectiveCoverageEntity, UUID> {
  List<CentralSubprocessRiskControlObjectiveCoverageEntity> findBySubprocessIdAndStatusNot(UUID subprocessId, MasterDataLifecycleStatus status);
  List<CentralSubprocessRiskControlObjectiveCoverageEntity> findBySubprocessIdAndStatus(UUID subprocessId, MasterDataLifecycleStatus status);
  List<CentralSubprocessRiskControlObjectiveCoverageEntity> findByRiskScopeIdAndStatusNot(UUID riskScopeId, MasterDataLifecycleStatus status);
  List<CentralSubprocessRiskControlObjectiveCoverageEntity> findByControlObjectiveScopeIdAndStatusNot(UUID controlObjectiveScopeId, MasterDataLifecycleStatus status);
  List<CentralSubprocessRiskControlObjectiveCoverageEntity> findByRiskScopeIdInAndStatusNot(List<UUID> riskScopeIds, MasterDataLifecycleStatus status);
  List<CentralSubprocessRiskControlObjectiveCoverageEntity> findByControlObjectiveScopeIdInAndStatusNot(List<UUID> controlObjectiveScopeIds, MasterDataLifecycleStatus status);
  @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from CentralSubprocessRiskControlObjectiveCoverageEntity c where c.id in :ids order by c.riskScopeId, c.controlObjectiveScopeId, c.id")
  List<CentralSubprocessRiskControlObjectiveCoverageEntity> lockAllByIds(@Param("ids") List<UUID> ids);
  @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from CentralSubprocessRiskControlObjectiveCoverageEntity c where c.subprocessId = :subprocessId and c.riskScopeId = :riskScopeId and c.controlObjectiveScopeId = :controlObjectiveScopeId")
  Optional<CentralSubprocessRiskControlObjectiveCoverageEntity> lockByBusinessKey(@Param("subprocessId") UUID subprocessId, @Param("riskScopeId") UUID riskScopeId, @Param("controlObjectiveScopeId") UUID controlObjectiveScopeId);
}

