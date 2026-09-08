package com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.domain.entity.CentralControlAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralControlAccountGroupRepository extends JpaRepository<CentralControlAccountGroupEntity, UUID> {
  List<CentralControlAccountGroupEntity> findByControlIdAndStatusNot(UUID controlId, MasterDataLifecycleStatus status);
  List<CentralControlAccountGroupEntity> findByControlIdAndStatus(UUID controlId, MasterDataLifecycleStatus status);
  List<CentralControlAccountGroupEntity> findByAccountGroupIdAndStatusNot(UUID accountGroupId, MasterDataLifecycleStatus status);
  List<CentralControlAccountGroupEntity> findByControlIdInAndStatusNot(List<UUID> controlIds, MasterDataLifecycleStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select c from CentralControlAccountGroupEntity c where c.controlId = :controlId and c.accountGroupId in :accountGroupIds order by c.accountGroupId, c.id")
  List<CentralControlAccountGroupEntity> lockByBusinessKeys(@Param("controlId") UUID controlId, @Param("accountGroupIds") List<UUID> accountGroupIds);
}
