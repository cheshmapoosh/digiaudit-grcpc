package com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.entity.CentralSubprocessRequirementScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralSubprocessRequirementScopeRepository
    extends JpaRepository<CentralSubprocessRequirementScopeEntity, UUID> {
  List<CentralSubprocessRequirementScopeEntity> findBySubprocessIdAndStatusNot(UUID subprocessId, MasterDataLifecycleStatus status);
  List<CentralSubprocessRequirementScopeEntity> findBySubprocessIdAndStatus(UUID subprocessId, MasterDataLifecycleStatus status);
  List<CentralSubprocessRequirementScopeEntity> findByRequirementIdAndStatusNot(UUID requirementId, MasterDataLifecycleStatus status);
  List<CentralSubprocessRequirementScopeEntity> findByRequirementIdAndStatus(UUID requirementId, MasterDataLifecycleStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from CentralSubprocessRequirementScopeEntity s where s.subprocessId = :subprocessId and s.requirementId in :requirementIds order by s.requirementId, s.id")
  List<CentralSubprocessRequirementScopeEntity> lockByBusinessKeys(
      @Param("subprocessId") UUID subprocessId,
      @Param("requirementIds") List<UUID> requirementIds);
}
