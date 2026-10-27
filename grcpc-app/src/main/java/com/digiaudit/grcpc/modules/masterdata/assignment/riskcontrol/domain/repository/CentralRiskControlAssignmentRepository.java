package com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.domain.entity.CentralRiskControlAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CentralRiskControlAssignmentRepository extends JpaRepository<CentralRiskControlAssignmentEntity, UUID> {
  List<CentralRiskControlAssignmentEntity> findByControlIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);
  List<CentralRiskControlAssignmentEntity> findByControlIdAndStatus(UUID id, MasterDataLifecycleStatus status);
  List<CentralRiskControlAssignmentEntity> findByRiskTemplateIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select a from CentralRiskControlAssignmentEntity a where a.controlId = :ownerId and a.riskTemplateId in :ids order by a.riskTemplateId, a.id")
  List<CentralRiskControlAssignmentEntity> lockByBusinessKeys(@Param("ownerId") UUID ownerId, @Param("ids") List<UUID> ids);
}
