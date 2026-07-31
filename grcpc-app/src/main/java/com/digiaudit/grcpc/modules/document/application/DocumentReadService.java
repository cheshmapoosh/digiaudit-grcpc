package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.common.exception.ForbiddenException;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentDownloadResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentLinkSummaryResponse;
import com.digiaudit.grcpc.modules.document.domain.DocumentLifecycleStatus;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.document.domain.DocumentTargetContext;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentLinkEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentLinkReadProjection;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentVersionEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.InternalDocumentJpaRepository;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.InternalDocumentLinkJpaRepository;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.InternalDocumentVersionJpaRepository;
import com.digiaudit.grcpc.modules.securityacl.application.ResourceAuthorizationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class DocumentReadService {
    private static final String VIEW_PERMISSION = "DOCUMENT_VIEW";
    private static final String DOWNLOAD_PERMISSION = "DOCUMENT_DOWNLOAD";

    private final InternalDocumentJpaRepository documentRepository;
    private final InternalDocumentVersionJpaRepository versionRepository;
    private final InternalDocumentLinkJpaRepository linkRepository;
    private final DocumentTargetContextResolver targetContextResolver;
    private final ResourceAuthorizationService authorizationService;
    private final DocumentStoragePort storagePort;
    private final DocumentResponseMapper responseMapper;

    public DocumentReadService(
            InternalDocumentJpaRepository documentRepository,
            InternalDocumentVersionJpaRepository versionRepository,
            InternalDocumentLinkJpaRepository linkRepository,
            DocumentTargetContextResolver targetContextResolver,
            ResourceAuthorizationService authorizationService,
            DocumentStoragePort storagePort,
            DocumentResponseMapper responseMapper
    ) {
        this.documentRepository = Objects.requireNonNull(documentRepository, "documentRepository is required");
        this.versionRepository = Objects.requireNonNull(versionRepository, "versionRepository is required");
        this.linkRepository = Objects.requireNonNull(linkRepository, "linkRepository is required");
        this.targetContextResolver = Objects.requireNonNull(targetContextResolver, "targetContextResolver is required");
        this.authorizationService = Objects.requireNonNull(authorizationService, "authorizationService is required");
        this.storagePort = Objects.requireNonNull(storagePort, "storagePort is required");
        this.responseMapper = Objects.requireNonNull(responseMapper, "responseMapper is required");
    }

    public List<DocumentLinkSummaryResponse> listByTarget(String targetWireValue, UUID targetId) {
        DocumentTargetContext targetContext = resolvePublicTarget(targetWireValue, targetId);
        authorizationService.assertCanAccess(
                targetContext.authorizationResourceType(),
                targetContext.authorizationResourceId(),
                VIEW_PERMISSION
        );
        return linkRepository.findLinkedDocumentsForTarget(
                        targetContext.targetType(),
                        targetContext.targetId(),
                        DocumentLifecycleStatus.DELETED
                )
                .stream()
                .map(responseMapper::toLinkSummary)
                .toList();
    }

    public List<DocumentLinkSummaryResponse> getDocument(UUID documentId) {
        if (!documentRepository.existsById(documentId)) {
            throw DocumentFailures.notFound("DOCUMENT_NOT_FOUND", "Document was not found");
        }
        List<DocumentLinkReadProjection> rows = linkRepository.findLinkedDocumentsForDocument(documentId, DocumentLifecycleStatus.DELETED);
        requireAtLeastOneAccessiblePublicLink(rows, VIEW_PERMISSION);
        return rows.stream().map(responseMapper::toLinkSummary).toList();
    }

    public List<DocumentLinkSummaryResponse> listVersions(UUID documentId) {
        return getDocument(documentId);
    }

    public List<DocumentLinkSummaryResponse> getDocumentVersion(UUID documentVersionId) {
        if (!versionRepository.existsById(documentVersionId)) {
            throw DocumentFailures.notFound("DOCUMENT_VERSION_NOT_FOUND", "Document version was not found");
        }
        List<DocumentLinkReadProjection> rows = linkRepository.findLinkedDocumentsForVersion(documentVersionId, DocumentLifecycleStatus.DELETED);
        requireAtLeastOneAccessiblePublicLink(rows, VIEW_PERMISSION);
        return rows.stream().map(responseMapper::toLinkSummary).toList();
    }

    public DocumentLinkSummaryResponse findSummaryByLinkId(UUID linkId) {
        DocumentLinkReadProjection projection = linkRepository.findSummaryByLinkId(linkId)
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_LINK_NOT_FOUND", "Document link was not found"));
        return responseMapper.toLinkSummary(projection);
    }

    public DocumentDownloadResponse createDownload(UUID documentVersionId) {
        DocumentVersionEntity version = versionRepository.findById(documentVersionId)
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_VERSION_NOT_FOUND", "Document version was not found"));
        if (version.getStatus() == DocumentLifecycleStatus.DELETED) {
            throw DocumentFailures.notFound("DOCUMENT_VERSION_NOT_FOUND", "Document version was not found");
        }
        DocumentEntity document = documentRepository.findById(version.getDocumentId())
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_NOT_FOUND", "Document was not found"));
        if (document.getStatus() == DocumentLifecycleStatus.DELETED) {
            throw DocumentFailures.notFound("DOCUMENT_NOT_FOUND", "Document was not found");
        }

        boolean allowed = false;
        for (DocumentLinkEntity link : linkRepository.findActiveLinksForVersion(documentVersionId, DocumentLifecycleStatus.ACTIVE)) {
            if (!link.getTargetType().isPublicSelectable()) {
                continue;
            }
            try {
                DocumentTargetContext targetContext = targetContextResolver.resolvePublic(link.getTargetType(), link.getTargetId());
                authorizationService.assertCanAccess(
                        targetContext.authorizationResourceType(),
                        targetContext.authorizationResourceId(),
                        DOWNLOAD_PERMISSION
                );
                allowed = true;
                break;
            } catch (ForbiddenException ex) {
                // Try another active public link for this immutable version.
            } catch (RuntimeException ex) {
                // Deleted or invalid targets cannot authorize download, but another link may.
            }
        }
        if (!allowed) {
            throw DocumentFailures.forbidden("DOWNLOAD_DENIED", "Document download is not allowed for the current user");
        }

        try {
            DocumentStoragePort.DocumentDownloadAccess access = storagePort.createDownloadAccess(
                    version.getStorageObjectKey(),
                    version.getFileName(),
                    version.getMimeType()
            );
            return new DocumentDownloadResponse(access.downloadUrl(), access.expiresAt(), version.getFileName(), version.getMimeType());
        } catch (DocumentStorageException ex) {
            throw DocumentTemporaryUploadService.storageFailure(ex);
        }
    }

    private DocumentTargetContext resolvePublicTarget(String targetWireValue, UUID targetId) {
        try {
            return targetContextResolver.resolvePublic(DocumentLinkTargetType.fromPublicWireValue(targetWireValue), targetId);
        } catch (IllegalArgumentException ex) {
            throw DocumentFailures.invalid("TARGET_NOT_ALLOWED", "Document link target type is not allowed");
        }
    }

    private void requireAtLeastOneAccessiblePublicLink(List<DocumentLinkReadProjection> rows, String permission) {
        if (rows.isEmpty()) {
            throw DocumentFailures.notFound("DOCUMENT_LINK_NOT_FOUND", "Document link was not found");
        }
        for (DocumentLinkReadProjection row : rows) {
            if (!row.targetType().isPublicSelectable() || row.linkStatus() != DocumentLifecycleStatus.ACTIVE) {
                continue;
            }
            try {
                DocumentTargetContext targetContext = targetContextResolver.resolvePublic(row.targetType(), row.targetId());
                authorizationService.assertCanAccess(
                        targetContext.authorizationResourceType(),
                        targetContext.authorizationResourceId(),
                        permission
                );
                return;
            } catch (ForbiddenException ex) {
                // Continue scanning active public links.
            } catch (RuntimeException ex) {
                // Ignore invalid/deleted target contexts while looking for another accessible link.
            }
        }
        throw DocumentFailures.forbidden("DOCUMENT_ACCESS_DENIED", "Document is not accessible for the current user");
    }
}
