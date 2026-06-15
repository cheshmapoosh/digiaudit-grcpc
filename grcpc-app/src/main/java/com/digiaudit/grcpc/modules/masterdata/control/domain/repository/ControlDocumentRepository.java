package com.digiaudit.grcpc.modules.masterdata.control.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlDocumentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ControlDocumentRepository extends JpaRepository<ControlDocumentEntity, UUID> {

    List<ControlDocumentEntity> findByControlAssignmentIdOrderByCreatedAtAsc(UUID controlAssignmentId);

    Optional<ControlDocumentEntity> findByIdAndControlAssignmentId(UUID id, UUID controlAssignmentId);
}
