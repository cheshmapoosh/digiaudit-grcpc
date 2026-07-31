package com.digiaudit.grcpc.modules.document.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface InternalDocumentTempUploadJpaRepository extends JpaRepository<DocumentTempUploadEntity, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from DocumentTempUploadEntity t where t.id = :id")
    Optional<DocumentTempUploadEntity> lockById(@Param("id") UUID id);
}
