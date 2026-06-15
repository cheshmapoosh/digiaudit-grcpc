package com.digiaudit.grcpc.modules.masterdata.process.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessAccountGroupAssignmentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessAccountGroupAssignmentRepository extends JpaRepository<ProcessAccountGroupAssignmentEntity, UUID> {

    List<ProcessAccountGroupAssignmentEntity> findByProcessNodeIdOrderByCreatedAtAsc(UUID processNodeId);

    Optional<ProcessAccountGroupAssignmentEntity> findByProcessNodeIdAndAccountGroupId(UUID processNodeId, UUID accountGroupId);

    boolean existsByProcessNodeId(UUID processNodeId);
}
