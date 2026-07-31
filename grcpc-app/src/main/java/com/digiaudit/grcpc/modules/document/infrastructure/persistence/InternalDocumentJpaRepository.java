package com.digiaudit.grcpc.modules.document.infrastructure.persistence;

import com.digiaudit.grcpc.modules.document.domain.DocumentLifecycleStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface InternalDocumentJpaRepository extends JpaRepository<DocumentEntity, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from DocumentEntity d where d.id = :id")
    Optional<DocumentEntity> lockById(@Param("id") UUID id);

    @Query("select d.status from DocumentEntity d where d.id = :id")
    Optional<DocumentLifecycleStatus> findStatusById(@Param("id") UUID id);
}
