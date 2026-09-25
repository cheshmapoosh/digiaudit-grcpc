package com.digiaudit.grcpc.modules.masterdata.coverage.controlcontrolobjective.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.coverage.controlcontrolobjective.domain.entity.CentralSubprocessControlControlObjectiveCoverageEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List; import java.util.Optional; import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository; import org.springframework.data.jpa.repository.Lock; import org.springframework.data.jpa.repository.Query; import org.springframework.data.repository.query.Param;

public interface CentralSubprocessControlControlObjectiveCoverageRepository extends JpaRepository<CentralSubprocessControlControlObjectiveCoverageEntity,UUID>{
  List<CentralSubprocessControlControlObjectiveCoverageEntity> findBySubprocessIdAndStatusNot(UUID subprocessId,MasterDataLifecycleStatus status); List<CentralSubprocessControlControlObjectiveCoverageEntity> findBySubprocessIdAndStatus(UUID subprocessId,MasterDataLifecycleStatus status); List<CentralSubprocessControlControlObjectiveCoverageEntity> findByControlScopeIdAndStatusNot(UUID controlScopeId,MasterDataLifecycleStatus status); List<CentralSubprocessControlControlObjectiveCoverageEntity> findByControlObjectiveScopeIdAndStatusNot(UUID controlObjectiveScopeId,MasterDataLifecycleStatus status);
  List<CentralSubprocessControlControlObjectiveCoverageEntity> findByControlScopeIdInAndStatusNot(List<UUID> controlScopeIds,MasterDataLifecycleStatus status); List<CentralSubprocessControlControlObjectiveCoverageEntity> findByControlObjectiveScopeIdInAndStatusNot(List<UUID> controlObjectiveScopeIds,MasterDataLifecycleStatus status);
  @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from CentralSubprocessControlControlObjectiveCoverageEntity c where c.id in :ids order by c.controlScopeId, c.controlObjectiveScopeId, c.id") List<CentralSubprocessControlControlObjectiveCoverageEntity> lockAllByIds(@Param("ids") List<UUID> ids);
  @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from CentralSubprocessControlControlObjectiveCoverageEntity c where c.subprocessId=:subprocessId and c.controlScopeId=:controlScopeId and c.controlObjectiveScopeId=:controlObjectiveScopeId") Optional<CentralSubprocessControlControlObjectiveCoverageEntity> lockByBusinessKey(@Param("subprocessId") UUID subprocessId,@Param("controlScopeId") UUID controlScopeId,@Param("controlObjectiveScopeId") UUID controlObjectiveScopeId);
}
