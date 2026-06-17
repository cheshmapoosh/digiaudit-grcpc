package com.digiaudit.grcpc.modules.masterdata.objective.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.objective.domain.entity.ObjectiveOrganizationAssignmentEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ObjectiveOrganizationAssignmentRepository
        extends JpaRepository<ObjectiveOrganizationAssignmentEntity, UUID> {

    List<ObjectiveOrganizationAssignmentEntity> findByObjectiveNodeIdOrderByCreatedAtAsc(
            UUID objectiveNodeId
    );

    List<ObjectiveOrganizationAssignmentEntity> findByOrganizationIdAndActiveTrueOrderByCreatedAtAsc(
            UUID organizationId
    );

    List<ObjectiveOrganizationAssignmentEntity> findByObjectiveNodeIdInAndActiveTrueOrderByCreatedAtAsc(
            List<UUID> objectiveNodeIds
    );

    void deleteByObjectiveNodeId(UUID objectiveNodeId);
}
