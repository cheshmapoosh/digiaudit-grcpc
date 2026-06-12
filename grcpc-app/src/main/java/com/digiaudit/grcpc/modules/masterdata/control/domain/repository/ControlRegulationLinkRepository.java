package com.digiaudit.grcpc.modules.masterdata.control.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlRegulationLinkEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ControlRegulationLinkRepository extends JpaRepository<ControlRegulationLinkEntity, UUID> {

    List<ControlRegulationLinkEntity> findByControlAssignmentIdOrderByCreatedAtAsc(UUID controlAssignmentId);

    Optional<ControlRegulationLinkEntity> findByControlAssignmentIdAndRegulationId(
            UUID controlAssignmentId,
            UUID regulationId
    );

    Optional<ControlRegulationLinkEntity> findByIdAndControlAssignmentId(UUID id, UUID controlAssignmentId);
}
