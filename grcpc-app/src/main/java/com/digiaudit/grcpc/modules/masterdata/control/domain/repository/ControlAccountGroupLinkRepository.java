package com.digiaudit.grcpc.modules.masterdata.control.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlAccountGroupLinkEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ControlAccountGroupLinkRepository extends JpaRepository<ControlAccountGroupLinkEntity, UUID> {

    List<ControlAccountGroupLinkEntity> findByControlAssignmentIdOrderByCreatedAtAsc(UUID controlAssignmentId);

    Optional<ControlAccountGroupLinkEntity> findByControlAssignmentIdAndAccountGroupId(
            UUID controlAssignmentId,
            UUID accountGroupId
    );

    Optional<ControlAccountGroupLinkEntity> findByIdAndControlAssignmentId(UUID id, UUID controlAssignmentId);
}
