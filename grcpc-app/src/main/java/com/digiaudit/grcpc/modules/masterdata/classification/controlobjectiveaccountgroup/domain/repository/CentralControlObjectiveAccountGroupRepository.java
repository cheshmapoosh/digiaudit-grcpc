package com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.domain.entity.CentralControlObjectiveAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralControlObjectiveAccountGroupRepository
    extends JpaRepository<CentralControlObjectiveAccountGroupEntity, UUID> {
  List<CentralControlObjectiveAccountGroupEntity> findByControlObjectiveIdAndStatusNot(
      UUID controlObjectiveId, MasterDataLifecycleStatus status);
  List<CentralControlObjectiveAccountGroupEntity> findByControlObjectiveIdAndStatus(
      UUID controlObjectiveId, MasterDataLifecycleStatus status);
  List<CentralControlObjectiveAccountGroupEntity> findByAccountGroupIdAndStatusNot(
      UUID accountGroupId, MasterDataLifecycleStatus status);
  List<CentralControlObjectiveAccountGroupEntity> findByControlObjectiveIdInAndStatusNot(
      List<UUID> controlObjectiveIds, MasterDataLifecycleStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select c from CentralControlObjectiveAccountGroupEntity c where c.controlObjectiveId = :controlObjectiveId and c.accountGroupId in :accountGroupIds order by c.accountGroupId, c.id")
  List<CentralControlObjectiveAccountGroupEntity> lockByBusinessKeys(
      @Param("controlObjectiveId") UUID controlObjectiveId,
      @Param("accountGroupIds") List<UUID> accountGroupIds);
}
