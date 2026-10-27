package com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.domain.entity.CentralRiskControlObjectiveAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CentralRiskControlObjectiveAssignmentRepository extends JpaRepository<CentralRiskControlObjectiveAssignmentEntity, UUID> {
  List<CentralRiskControlObjectiveAssignmentEntity> findByControlObjectiveIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);
  List<CentralRiskControlObjectiveAssignmentEntity> findByControlObjectiveIdAndStatus(UUID id, MasterDataLifecycleStatus status);
  List<CentralRiskControlObjectiveAssignmentEntity> findByRiskTemplateIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select a from CentralRiskControlObjectiveAssignmentEntity a where a.controlObjectiveId = :ownerId and a.riskTemplateId in :ids order by a.riskTemplateId, a.id")
  List<CentralRiskControlObjectiveAssignmentEntity> lockByBusinessKeys(@Param("ownerId") UUID ownerId, @Param("ids") List<UUID> ids);
}
