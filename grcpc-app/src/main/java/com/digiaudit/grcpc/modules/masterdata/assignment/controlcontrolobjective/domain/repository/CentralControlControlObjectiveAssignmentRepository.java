package com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.domain.entity.CentralControlControlObjectiveAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CentralControlControlObjectiveAssignmentRepository extends JpaRepository<CentralControlControlObjectiveAssignmentEntity, UUID> {
  List<CentralControlControlObjectiveAssignmentEntity> findByControlIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);
  List<CentralControlControlObjectiveAssignmentEntity> findByControlIdAndStatus(UUID id, MasterDataLifecycleStatus status);
  List<CentralControlControlObjectiveAssignmentEntity> findByControlObjectiveIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select a from CentralControlControlObjectiveAssignmentEntity a where a.controlId = :ownerId and a.controlObjectiveId in :ids order by a.controlObjectiveId, a.id")
  List<CentralControlControlObjectiveAssignmentEntity> lockByBusinessKeys(@Param("ownerId") UUID ownerId, @Param("ids") List<UUID> ids);
}
