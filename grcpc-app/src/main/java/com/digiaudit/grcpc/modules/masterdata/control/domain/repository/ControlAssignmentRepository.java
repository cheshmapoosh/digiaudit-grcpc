package com.digiaudit.grcpc.modules.masterdata.control.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.control.domain.enums.ControlAssignmentStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ControlAssignmentRepository extends JpaRepository<ControlAssignmentEntity, UUID> {

    List<ControlAssignmentEntity> findBySubProcessIdInAndAssignmentStatus(
            List<UUID> subProcessIds,
            ControlAssignmentStatus assignmentStatus
    );

    List<ControlAssignmentEntity> findByAssignmentStatusOrderBySortOrderAscCreatedAtAsc(
            ControlAssignmentStatus assignmentStatus
    );

    boolean existsBySubProcessId(UUID subProcessId);

    boolean existsByControlIdAndSubProcessIdAndAssignmentStatus(
            UUID controlId,
            UUID subProcessId,
            ControlAssignmentStatus assignmentStatus
    );

    boolean existsByControlIdAndSubProcessIdAndAssignmentStatusAndIdNot(
            UUID controlId,
            UUID subProcessId,
            ControlAssignmentStatus assignmentStatus,
            UUID id
    );
}
