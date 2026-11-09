package com.digiaudit.grcpc.modules.masterdata.assignment.accountgrouprisk.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.assignment.accountgrouprisk.domain.entity.CentralAccountGroupRiskAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralAccountGroupRiskAssignmentRepository
    extends JpaRepository<CentralAccountGroupRiskAssignmentEntity, UUID> {
  List<CentralAccountGroupRiskAssignmentEntity> findByAccountGroupIdAndStatusNot(
      UUID accountGroupId, MasterDataLifecycleStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("""
      select a from CentralAccountGroupRiskAssignmentEntity a
      where a.accountGroupId = :accountGroupId and a.riskTemplateId in :riskIds
      order by a.riskTemplateId
      """)
  List<CentralAccountGroupRiskAssignmentEntity> lockPairs(@Param("accountGroupId") UUID accountGroupId,
      @Param("riskIds") List<UUID> riskIds);
}
