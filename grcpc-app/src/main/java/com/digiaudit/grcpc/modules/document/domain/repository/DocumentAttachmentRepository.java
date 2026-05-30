package com.digiaudit.grcpc.modules.document.domain.repository;

import com.digiaudit.grcpc.modules.document.domain.entity.DocumentAttachmentEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentAttachmentRepository extends JpaRepository<DocumentAttachmentEntity, UUID> {

    List<DocumentAttachmentEntity> findByTargetTypeAndTargetIdAndStatusOrderByUploadedAtDesc(String targetType, UUID targetId, String status);
}
