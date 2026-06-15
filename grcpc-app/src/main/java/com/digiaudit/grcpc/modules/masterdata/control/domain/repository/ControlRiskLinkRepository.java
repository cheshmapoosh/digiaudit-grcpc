package com.digiaudit.grcpc.modules.masterdata.control.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlRiskLinkEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ControlRiskLinkRepository extends JpaRepository<ControlRiskLinkEntity, UUID> {

    List<ControlRiskLinkEntity> findByControlAssignmentIdOrderByCreatedAtAsc(UUID controlAssignmentId);

    Optional<ControlRiskLinkEntity> findByControlAssignmentIdAndRiskId(UUID controlAssignmentId, UUID riskId);

    Optional<ControlRiskLinkEntity> findByIdAndControlAssignmentId(UUID id, UUID controlAssignmentId);
}
