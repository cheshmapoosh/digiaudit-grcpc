package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentDetailResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentDownloadResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentLinkSummaryResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentVersionResponse;
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

import java.util.ArrayList;
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

    public DocumentDetailResponse getDocument(UUID documentId) {
        DocumentEntity document = documentRepository.findById(documentId)
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_NOT_FOUND", "Document was not found"));
        if (document.getStatus() == DocumentLifecycleStatus.DELETED) {
            throw DocumentFailures.notFound("DOCUMENT_NOT_FOUND", "Document was not found");
        }
        requireAtLeastOneAccessiblePublicLink(documentId, VIEW_PERMISSION);
        return responseMapper.toDocumentDetail(document);
    }

    public List<DocumentVersionResponse> listVersions(UUID documentId) {
        DocumentEntity document = documentRepository.findById(documentId)
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_NOT_FOUND", "Document was not found"));
        if (document.getStatus() == DocumentLifecycleStatus.DELETED) {
            throw DocumentFailures.notFound("DOCUMENT_NOT_FOUND", "Document was not found");
        }
        requireAtLeastOneAccessiblePublicLink(documentId, VIEW_PERMISSION);

        List<DocumentVersionResponse> authorizedVersions = new ArrayList<>();
        for (DocumentVersionEntity version : versionRepository.findByDocumentIdOrderByDocumentVersionNumberAsc(documentId)) {
            if (version.getStatus() == DocumentLifecycleStatus.DELETED) {
                continue;
            }
            if (hasAccessibleActivePublicLink(version.getId(), VIEW_PERMISSION)) {
                authorizedVersions.add(responseMapper.toDocumentVersion(version));
            }
        }
        return authorizedVersions;
    }

    public DocumentVersionResponse getDocumentVersion(UUID documentVersionId) {
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
        if (!hasAccessibleActivePublicLink(documentVersionId, VIEW_PERMISSION)) {
            throw DocumentFailures.forbidden("DOCUMENT_ACCESS_DENIED", "Document version is not accessible for the current user");
        }
        return responseMapper.toDocumentVersion(version);
    }

    public DocumentLinkSummaryResponse findSummaryByLinkId(UUID linkId) {
        DocumentLinkReadProjection projection = linkRepository.findSummaryByLinkId(linkId)
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_LINK_NOT_FOUND", "Document link was not found"));
        return responseMapper.toLinkSummary(projection);
    }

    public DocumentDownloadResponse createDownload(UUID documentVersionId) {
        DocumentVersionEntity version = versionRepository.findById(documentVersionId)
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_VERSION_NOT_FOUND", "Document version was not found"));
        if (version.getStatus() != DocumentLifecycleStatus.ACTIVE) {
            throw DocumentFailures.notFound("DOCUMENT_VERSION_NOT_FOUND", "Document version was not found");
        }
        DocumentEntity document = documentRepository.findById(version.getDocumentId())
                .orElseThrow(() -> DocumentFailures.notFound("DOCUMENT_NOT_FOUND", "Document was not found"));
        if (document.getStatus() != DocumentLifecycleStatus.ACTIVE) {
            throw DocumentFailures.notFound("DOCUMENT_NOT_FOUND", "Document was not found");
        }
        if (!hasAccessibleActivePublicLink(documentVersionId, DOWNLOAD_PERMISSION)) {
            throw DocumentFailures.forbidden("DOWNLOAD_DENIED", "Document download is not allowed for the current user");
        }

        DocumentStoragePort.DocumentObjectMetadata expectedMetadata = new DocumentStoragePort.DocumentObjectMetadata(
                version.getMimeType(),
                version.getFileSize(),
                version.getChecksumAlgorithm(),
                version.getChecksumValue()
        );
        try {
            storagePort.verifyPermanentObject(version.getStorageObjectKey(), expectedMetadata);
            DocumentStoragePort.DocumentDownloadAccess access = storagePort.createDownloadAccess(
                    version.getStorageObjectKey(),
                    version.getFileName(),
                    version.getMimeType()
            );
            return new DocumentDownloadResponse(access.downloadUrl(), access.expiresAt(), version.getFileName(), version.getMimeType());
        } catch (DocumentStorageException ex) {
            throw downloadStorageFailure(ex);
        }
    }

    private DocumentTargetContext resolvePublicTarget(String targetWireValue, UUID targetId) {
        try {
            return targetContextResolver.resolvePublic(DocumentLinkTargetType.fromPublicWireValue(targetWireValue), targetId);
        } catch (IllegalArgumentException ex) {
            throw DocumentFailures.invalid("TARGET_NOT_ALLOWED", "Document link target type is not allowed");
        }
    }

    private void requireAtLeastOneAccessiblePublicLink(UUID documentId, String permission) {
        List<DocumentLinkReadProjection> rows = linkRepository.findLinkedDocumentsForDocument(documentId, DocumentLifecycleStatus.DELETED);
        if (rows.isEmpty()) {
            throw DocumentFailures.notFound("DOCUMENT_LINK_NOT_FOUND", "Document link was not found");
        }
        for (DocumentLinkReadProjection row : rows) {
            if (row.linkStatus() != DocumentLifecycleStatus.ACTIVE || !row.targetType().isPublicSelectable()) {
                continue;
            }
            DocumentTargetContext targetContext = targetContextResolver.resolvePublic(row.targetType(), row.targetId());
            if (authorizationService.canAccess(
                    targetContext.authorizationResourceType(),
                    targetContext.authorizationResourceId(),
                    permission
            )) {
                return;
            }
        }
        throw DocumentFailures.forbidden("DOCUMENT_ACCESS_DENIED", "Document is not accessible for the current user");
    }

    private boolean hasAccessibleActivePublicLink(UUID documentVersionId, String permission) {
        for (DocumentLinkEntity link : linkRepository.findActiveLinksForVersion(documentVersionId, DocumentLifecycleStatus.ACTIVE)) {
            if (!link.getTargetType().isPublicSelectable()) {
                continue;
            }
            DocumentTargetContext targetContext = targetContextResolver.resolvePublic(link.getTargetType(), link.getTargetId());
            if (authorizationService.canAccess(
                    targetContext.authorizationResourceType(),
                    targetContext.authorizationResourceId(),
                    permission
            )) {
                return true;
            }
        }
        return false;
    }

    private RuntimeException downloadStorageFailure(DocumentStorageException ex) {
        return switch (ex.errorCode()) {
            case "DOCUMENT_STORAGE_DISABLED" -> DocumentFailures.conflict("DOCUMENT_STORAGE_DISABLED", "Document storage is not configured");
            case "DOCUMENT_OBJECT_MISSING" -> DocumentFailures.conflict("DOCUMENT_VERSION_OBJECT_MISSING", "Document version object was not found");
            case "DOCUMENT_OBJECT_METADATA_MISMATCH" -> DocumentFailures.conflict("DOCUMENT_OBJECT_METADATA_MISMATCH", "Document version object metadata mismatch");
            case "DOCUMENT_STORAGE_ACCESS_DENIED" -> DocumentFailures.conflict("DOCUMENT_STORAGE_ACCESS_DENIED", "Document storage access is denied or misconfigured");
            case "DOCUMENT_DOWNLOAD_PREPARATION_FAILED" -> DocumentFailures.conflict("DOCUMENT_DOWNLOAD_PREPARATION_FAILED", "Document download access could not be created");
            default -> DocumentFailures.conflict("DOCUMENT_STORAGE_UNAVAILABLE", "Document storage is unavailable");
        };
    }
}
