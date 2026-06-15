package com.digiaudit.grcpc.modules.document.domain.repository;

import com.digiaudit.grcpc.modules.document.domain.entity.DocumentTempUploadEntity;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentTempUploadRepository extends JpaRepository<DocumentTempUploadEntity, UUID> {

    List<DocumentTempUploadEntity> findByTargetTypeAndTempSessionIdOrderByUploadedAtDesc(
            String targetType,
            UUID tempSessionId
    );

    List<DocumentTempUploadEntity> findByTempSessionId(UUID tempSessionId);

    List<DocumentTempUploadEntity> findByExpiresAtBefore(LocalDateTime expiresAt);
}
