package com.digiaudit.grcpc.modules.masterdata.process.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessRiskAssignmentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessRiskAssignmentRepository extends JpaRepository<ProcessRiskAssignmentEntity, UUID> {

    List<ProcessRiskAssignmentEntity> findByProcessNodeIdOrderByCreatedAtAsc(UUID processNodeId);

    Optional<ProcessRiskAssignmentEntity> findByProcessNodeIdAndRiskNodeId(UUID processNodeId, UUID riskNodeId);

    boolean existsByProcessNodeId(UUID processNodeId);

    boolean existsByRiskNodeId(UUID riskNodeId);
}
