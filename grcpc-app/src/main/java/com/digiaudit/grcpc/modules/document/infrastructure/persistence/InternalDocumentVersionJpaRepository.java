package com.digiaudit.grcpc.modules.document.infrastructure.persistence;

import com.digiaudit.grcpc.modules.document.domain.DocumentLifecycleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InternalDocumentVersionJpaRepository extends JpaRepository<DocumentVersionEntity, UUID> {
    @Query("select coalesce(max(v.documentVersionNumber), 0) from DocumentVersionEntity v where v.documentId = :documentId")
    long maxVersionNumberForLockedDocument(@Param("documentId") UUID documentId);

    List<DocumentVersionEntity> findByDocumentIdOrderByDocumentVersionNumberAsc(UUID documentId);

    Optional<DocumentVersionEntity> findByStorageObjectKey(String storageObjectKey);

    @Query("""
            select count(v) > 0
            from DocumentVersionEntity v
            where v.id = :id and v.status <> :deletedStatus
            """)
    boolean existsUsableById(
            @Param("id") UUID id,
            @Param("deletedStatus") DocumentLifecycleStatus deletedStatus
    );
}
