package com.digiaudit.grcpc.modules.masterdata.process.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessRegulationAssignmentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessRegulationAssignmentRepository extends JpaRepository<ProcessRegulationAssignmentEntity, UUID> {

    List<ProcessRegulationAssignmentEntity> findByProcessNodeIdOrderByCreatedAtAsc(UUID processNodeId);

    Optional<ProcessRegulationAssignmentEntity> findByProcessNodeIdAndRegulationNodeId(UUID processNodeId, UUID regulationNodeId);

    boolean existsByProcessNodeId(UUID processNodeId);

    boolean existsByRegulationNodeId(UUID regulationNodeId);
}
