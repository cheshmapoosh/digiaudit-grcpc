package com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.entity.CentralSubprocessControlObjectiveScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralSubprocessControlObjectiveScopeRepository
    extends JpaRepository<CentralSubprocessControlObjectiveScopeEntity, UUID> {
  List<CentralSubprocessControlObjectiveScopeEntity> findBySubprocessIdAndStatusNot(UUID subprocessId, MasterDataLifecycleStatus status);
  List<CentralSubprocessControlObjectiveScopeEntity> findBySubprocessIdAndStatus(UUID subprocessId, MasterDataLifecycleStatus status);
  List<CentralSubprocessControlObjectiveScopeEntity> findByControlObjectiveIdAndStatusNot(UUID controlObjectiveId, MasterDataLifecycleStatus status);
  List<CentralSubprocessControlObjectiveScopeEntity> findByControlObjectiveIdAndStatus(UUID controlObjectiveId, MasterDataLifecycleStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from CentralSubprocessControlObjectiveScopeEntity s where s.subprocessId = :subprocessId and s.controlObjectiveId in :controlObjectiveIds order by s.controlObjectiveId, s.id")
  List<CentralSubprocessControlObjectiveScopeEntity> lockByBusinessKeys(
      @Param("subprocessId") UUID subprocessId,
      @Param("controlObjectiveIds") List<UUID> controlObjectiveIds);
}
