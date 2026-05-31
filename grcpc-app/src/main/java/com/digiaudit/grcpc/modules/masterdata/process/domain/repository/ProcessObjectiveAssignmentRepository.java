package com.digiaudit.grcpc.modules.masterdata.process.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessObjectiveAssignmentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessObjectiveAssignmentRepository extends JpaRepository<ProcessObjectiveAssignmentEntity, UUID> {

    List<ProcessObjectiveAssignmentEntity> findByProcessNodeIdOrderByCreatedAtAsc(UUID processNodeId);

    Optional<ProcessObjectiveAssignmentEntity> findByProcessNodeIdAndObjectiveNodeId(UUID processNodeId, UUID objectiveNodeId);

    boolean existsByProcessNodeId(UUID processNodeId);
}
