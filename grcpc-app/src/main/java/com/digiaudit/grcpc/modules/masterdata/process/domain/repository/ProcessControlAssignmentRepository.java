package com.digiaudit.grcpc.modules.masterdata.process.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessControlAssignmentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessControlAssignmentRepository extends JpaRepository<ProcessControlAssignmentEntity, UUID> {

    List<ProcessControlAssignmentEntity> findByProcessNodeIdAndActiveTrue(UUID processNodeId);

    List<ProcessControlAssignmentEntity> findByProcessNodeIdInAndActiveTrue(List<UUID> processNodeIds);

    List<ProcessControlAssignmentEntity> findByControlIdAndActiveTrue(UUID controlId);

    Optional<ProcessControlAssignmentEntity> findFirstByControlIdAndActiveTrueOrderByCreatedAtAsc(UUID controlId);

    boolean existsByProcessNodeId(UUID processNodeId);

    void deleteByControlId(UUID controlId);
}
