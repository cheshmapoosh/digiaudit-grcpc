package com.digiaudit.grcpc.modules.masterdata.control.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlStepEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ControlStepRepository extends JpaRepository<ControlStepEntity, UUID> {

    List<ControlStepEntity> findByControlAssignmentIdOrderBySortOrderAscCreatedAtAsc(UUID controlAssignmentId);

    Optional<ControlStepEntity> findByIdAndControlAssignmentId(UUID id, UUID controlAssignmentId);
}
