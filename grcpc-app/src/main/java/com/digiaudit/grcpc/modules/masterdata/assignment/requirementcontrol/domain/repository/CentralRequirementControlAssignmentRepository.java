package com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.domain.entity.CentralRequirementControlAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CentralRequirementControlAssignmentRepository extends JpaRepository<CentralRequirementControlAssignmentEntity, UUID> {
  List<CentralRequirementControlAssignmentEntity> findByControlIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);
  List<CentralRequirementControlAssignmentEntity> findByControlIdAndStatus(UUID id, MasterDataLifecycleStatus status);
  List<CentralRequirementControlAssignmentEntity> findByRequirementIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select a from CentralRequirementControlAssignmentEntity a where a.controlId = :ownerId and a.requirementId in :ids order by a.requirementId, a.id")
  List<CentralRequirementControlAssignmentEntity> lockByBusinessKeys(@Param("ownerId") UUID ownerId, @Param("ids") List<UUID> ids);
}
