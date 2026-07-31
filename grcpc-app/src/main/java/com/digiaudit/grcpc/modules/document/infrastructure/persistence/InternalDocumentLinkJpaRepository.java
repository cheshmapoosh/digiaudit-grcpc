package com.digiaudit.grcpc.modules.document.infrastructure.persistence;

import com.digiaudit.grcpc.modules.document.domain.DocumentLifecycleStatus;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InternalDocumentLinkJpaRepository extends JpaRepository<DocumentLinkEntity, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from DocumentLinkEntity l where l.id = :id")
    Optional<DocumentLinkEntity> lockById(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select l
            from DocumentLinkEntity l
            where l.documentVersionId = :documentVersionId
              and l.targetType = :targetType
              and l.targetId = :targetId
            """)
    Optional<DocumentLinkEntity> lockByBusinessKey(
            @Param("documentVersionId") UUID documentVersionId,
            @Param("targetType") DocumentLinkTargetType targetType,
            @Param("targetId") UUID targetId
    );

    @Query("""
            select count(l) > 0
            from DocumentLinkEntity l, DocumentVersionEntity v
            where l.documentVersionId = v.id
              and v.documentId = :documentId
              and v.status <> :deletedStatus
              and l.targetType = :targetType
              and l.targetId = :targetId
              and l.status = :activeStatus
            """)
    boolean existsActiveDocumentTargetLink(
            @Param("documentId") UUID documentId,
            @Param("targetType") DocumentLinkTargetType targetType,
            @Param("targetId") UUID targetId,
            @Param("activeStatus") DocumentLifecycleStatus activeStatus,
            @Param("deletedStatus") DocumentLifecycleStatus deletedStatus
    );

    @Query("""
            select new com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentLinkReadProjection(
                d.id,
                d.version,
                d.code,
                d.title,
                d.description,
                d.documentCategoryCode,
                d.status,
                v.id,
                v.documentVersionNumber,
                v.fileName,
                v.mimeType,
                v.fileSize,
                v.checksumAlgorithm,
                v.status,
                l.id,
                l.version,
                l.targetType,
                l.targetId,
                l.status,
                v.createdAt,
                v.createdBy
            )
            from DocumentLinkEntity l, DocumentVersionEntity v, DocumentEntity d
            where l.documentVersionId = v.id
              and v.documentId = d.id
              and l.targetType = :targetType
              and l.targetId = :targetId
              and d.status <> :deletedStatus
              and v.status <> :deletedStatus
            order by d.title asc, v.documentVersionNumber desc, l.createdAt desc
            """)
    List<DocumentLinkReadProjection> findLinkedDocumentsForTarget(
            @Param("targetType") DocumentLinkTargetType targetType,
            @Param("targetId") UUID targetId,
            @Param("deletedStatus") DocumentLifecycleStatus deletedStatus
    );

    @Query("""
            select new com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentLinkReadProjection(
                d.id,
                d.version,
                d.code,
                d.title,
                d.description,
                d.documentCategoryCode,
                d.status,
                v.id,
                v.documentVersionNumber,
                v.fileName,
                v.mimeType,
                v.fileSize,
                v.checksumAlgorithm,
                v.status,
                l.id,
                l.version,
                l.targetType,
                l.targetId,
                l.status,
                v.createdAt,
                v.createdBy
            )
            from DocumentLinkEntity l, DocumentVersionEntity v, DocumentEntity d
            where l.documentVersionId = v.id
              and v.documentId = d.id
              and d.id = :documentId
              and d.status <> :deletedStatus
              and v.status <> :deletedStatus
            order by v.documentVersionNumber asc, l.createdAt asc
            """)
    List<DocumentLinkReadProjection> findLinkedDocumentsForDocument(
            @Param("documentId") UUID documentId,
            @Param("deletedStatus") DocumentLifecycleStatus deletedStatus
    );

    @Query("""
            select new com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentLinkReadProjection(
                d.id,
                d.version,
                d.code,
                d.title,
                d.description,
                d.documentCategoryCode,
                d.status,
                v.id,
                v.documentVersionNumber,
                v.fileName,
                v.mimeType,
                v.fileSize,
                v.checksumAlgorithm,
                v.status,
                l.id,
                l.version,
                l.targetType,
                l.targetId,
                l.status,
                v.createdAt,
                v.createdBy
            )
            from DocumentLinkEntity l, DocumentVersionEntity v, DocumentEntity d
            where l.documentVersionId = v.id
              and v.documentId = d.id
              and v.id = :documentVersionId
              and d.status <> :deletedStatus
              and v.status <> :deletedStatus
            order by l.createdAt asc
            """)
    List<DocumentLinkReadProjection> findLinkedDocumentsForVersion(
            @Param("documentVersionId") UUID documentVersionId,
            @Param("deletedStatus") DocumentLifecycleStatus deletedStatus
    );

    @Query("""
            select l
            from DocumentLinkEntity l
            where l.documentVersionId = :documentVersionId
              and l.status = :activeStatus
            """)
    List<DocumentLinkEntity> findActiveLinksForVersion(
            @Param("documentVersionId") UUID documentVersionId,
            @Param("activeStatus") DocumentLifecycleStatus activeStatus
    );

    @Query("""
            select new com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentLinkReadProjection(
                d.id,
                d.version,
                d.code,
                d.title,
                d.description,
                d.documentCategoryCode,
                d.status,
                v.id,
                v.documentVersionNumber,
                v.fileName,
                v.mimeType,
                v.fileSize,
                v.checksumAlgorithm,
                v.status,
                l.id,
                l.version,
                l.targetType,
                l.targetId,
                l.status,
                v.createdAt,
                v.createdBy
            )
            from DocumentLinkEntity l, DocumentVersionEntity v, DocumentEntity d
            where l.documentVersionId = v.id
              and v.documentId = d.id
              and l.id = :linkId
            """)
    Optional<DocumentLinkReadProjection> findSummaryByLinkId(@Param("linkId") UUID linkId);
}
