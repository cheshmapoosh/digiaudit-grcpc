package com.digiaudit.grcpc.modules.masterdata.control.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlPerformancePlanEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ControlPerformancePlanRepository extends JpaRepository<ControlPerformancePlanEntity, UUID> {

    List<ControlPerformancePlanEntity> findByControlAssignmentIdOrderByPlannedDateAscCreatedAtAsc(
            UUID controlAssignmentId
    );

    Optional<ControlPerformancePlanEntity> findByIdAndControlAssignmentId(UUID id, UUID controlAssignmentId);
}
