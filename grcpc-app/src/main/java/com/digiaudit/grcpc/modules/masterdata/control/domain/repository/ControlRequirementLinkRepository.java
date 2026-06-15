package com.digiaudit.grcpc.modules.masterdata.control.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlRequirementLinkEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ControlRequirementLinkRepository extends JpaRepository<ControlRequirementLinkEntity, UUID> {

    List<ControlRequirementLinkEntity> findByControlAssignmentIdOrderByCreatedAtAsc(UUID controlAssignmentId);

    Optional<ControlRequirementLinkEntity> findByControlAssignmentIdAndRequirementId(
            UUID controlAssignmentId,
            UUID requirementId
    );

    Optional<ControlRequirementLinkEntity> findByIdAndControlAssignmentId(UUID id, UUID controlAssignmentId);
}
