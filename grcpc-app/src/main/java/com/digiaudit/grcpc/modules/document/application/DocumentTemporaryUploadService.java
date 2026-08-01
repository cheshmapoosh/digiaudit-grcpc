package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentTemporaryUploadResponse;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentTempUploadEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.InternalDocumentTempUploadJpaRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Slf4j
@Service
public class DocumentTemporaryUploadService {
    private final CurrentUserProvider currentUserProvider;
    private final DocumentValidation validation;
    private final DocumentObjectKeyService objectKeyService;
    private final InternalDocumentTempUploadJpaRepository tempUploadRepository;
    private final DocumentStoragePort storagePort;
    private final DocumentResponseMapper responseMapper;
    private final com.digiaudit.grcpc.modules.document.config.MinioProperties properties;
    private final Clock clock;

    public DocumentTemporaryUploadService(
            CurrentUserProvider currentUserProvider,
            DocumentValidation validation,
            DocumentObjectKeyService objectKeyService,
            InternalDocumentTempUploadJpaRepository tempUploadRepository,
            DocumentStoragePort storagePort,
            DocumentResponseMapper responseMapper,
            com.digiaudit.grcpc.modules.document.config.MinioProperties properties,
            @Qualifier("documentClock") Clock clock
    ) {
        this.currentUserProvider = Objects.requireNonNull(currentUserProvider, "currentUserProvider is required");
        this.validation = Objects.requireNonNull(validation, "validation is required");
        this.objectKeyService = Objects.requireNonNull(objectKeyService, "objectKeyService is required");
        this.tempUploadRepository = Objects.requireNonNull(tempUploadRepository, "tempUploadRepository is required");
        this.storagePort = Objects.requireNonNull(storagePort, "storagePort is required");
        this.responseMapper = Objects.requireNonNull(responseMapper, "responseMapper is required");
        this.properties = Objects.requireNonNull(properties, "properties is required");
        this.clock = Objects.requireNonNull(clock, "clock is required");
    }

    public DocumentTemporaryUploadResponse upload(MultipartFile file) {
        UUID actorId = currentUserProvider.getCurrentUserIdOptional()
                .orElseThrow(() -> DocumentFailures.forbidden("DOCUMENT_ACTOR_REQUIRED", "Authenticated user is required"));
        DocumentValidation.SafeUploadMetadata safeUpload = validation.validateUpload(file);
        UUID tempUploadId = UUID.randomUUID();
        String temporaryObjectKey = objectKeyService.temporaryKey(tempUploadId, safeUpload.fileName());

        String checksum;
        try {
            storagePort.uploadTemporaryObject(new DocumentStoragePort.DocumentObjectUpload(
                    temporaryObjectKey,
                    safeUpload.fileName(),
                    safeUpload.mimeType(),
                    safeUpload.fileSize(),
                    null,
                    null,
                    file::getInputStream
            ));
            checksum = storagePort.calculateObjectChecksum(temporaryObjectKey, DocumentChecksumService.SHA_256);
            verifyStorageMetadata(storagePort.inspectObject(temporaryObjectKey), safeUpload);
        } catch (DocumentStorageException ex) {
            removeTemporaryObjectAfterFailure(tempUploadId, temporaryObjectKey);
            throw storageFailure(ex);
        } catch (RuntimeException ex) {
            removeTemporaryObjectAfterFailure(tempUploadId, temporaryObjectKey);
            throw ex;
        }

        Instant uploadedAt = Instant.now(clock);
        Instant expiresAt = uploadedAt.plus(Duration.ofMinutes(Math.max(1L, properties.tempTtlMinutes())));
        DocumentTempUploadEntity tempUpload = DocumentTempUploadEntity.create(
                tempUploadId,
                safeUpload.fileName(),
                safeUpload.mimeType(),
                safeUpload.fileSize(),
                temporaryObjectKey,
                DocumentChecksumService.SHA_256,
                checksum,
                actorId,
                uploadedAt,
                expiresAt
        );
        return responseMapper.toTemporaryUploadResponse(persistVerifiedTemporaryUpload(tempUpload, temporaryObjectKey));
    }

    public DocumentTemporaryUploadResponse get(UUID tempUploadId) {
        DocumentTempUploadEntity entity = tempUploadRepository.findById(tempUploadId)
                .orElseThrow(() -> DocumentFailures.notFound("TEMPORARY_UPLOAD_NOT_FOUND", "Temporary upload was not found"));
        UUID actorId = currentUserProvider.getCurrentUserIdOptional()
                .orElseThrow(() -> DocumentFailures.forbidden("DOCUMENT_ACTOR_REQUIRED", "Authenticated user is required"));
        if (!entity.getUploadedBy().equals(actorId)) {
            throw DocumentFailures.forbidden("TEMPORARY_UPLOAD_OWNERSHIP_DENIED", "Temporary upload is owned by another user");
        }
        return responseMapper.toTemporaryUploadResponse(entity);
    }

    private void verifyStorageMetadata(
            DocumentStoragePort.DocumentObjectMetadata actual,
            DocumentValidation.SafeUploadMetadata expected
    ) {
        if (actual.fileSize() != expected.fileSize()
                || !Objects.equals(actual.mimeType(), expected.mimeType())) {
            throw new DocumentStorageException("TEMPORARY_OBJECT_METADATA_MISMATCH", "Temporary upload metadata mismatch");
        }
    }

    private DocumentTempUploadEntity persistVerifiedTemporaryUpload(
            DocumentTempUploadEntity tempUpload,
            String temporaryObjectKey
    ) {
        try {
            return tempUploadRepository.saveAndFlush(tempUpload);
        } catch (RuntimeException ex) {
            removeTemporaryObjectAfterFailure(tempUpload.getId(), temporaryObjectKey);
            throw ex;
        }
    }

    private void removeTemporaryObjectAfterFailure(UUID tempUploadId, String temporaryObjectKey) {
        try {
            storagePort.removeTemporaryObjectBestEffort(temporaryObjectKey);
        } catch (RuntimeException cleanupFailure) {
            log.warn("Could not remove failed temporary document object. tempUploadId={}", tempUploadId);
        }
    }

    static RuntimeException storageFailure(DocumentStorageException ex) {
        return switch (ex.errorCode()) {
            case "DOCUMENT_STORAGE_DISABLED" -> DocumentFailures.conflict("DOCUMENT_STORAGE_DISABLED", "Document storage is not configured");
            case "DOCUMENT_OBJECT_MISSING" -> DocumentFailures.conflict("TEMPORARY_OBJECT_MISSING", "Temporary upload object was not found");
            case "TEMPORARY_OBJECT_METADATA_MISMATCH" -> DocumentFailures.conflict("TEMPORARY_OBJECT_METADATA_MISMATCH", "Temporary upload object metadata mismatch");
            case "DOCUMENT_OBJECT_METADATA_MISMATCH" -> DocumentFailures.conflict("DOCUMENT_OBJECT_METADATA_MISMATCH", "Document storage object metadata mismatch");
            case "PERMANENT_OBJECT_CONFLICT" -> DocumentFailures.conflict("PERMANENT_OBJECT_CONFLICT", "Document permanent object identity conflicts with existing content");
            case "PERMANENT_PROMOTION_FAILURE" -> DocumentFailures.conflict("PERMANENT_PROMOTION_FAILURE", "Document permanent object promotion failed");
            case "DOCUMENT_STORAGE_ACCESS_DENIED" -> DocumentFailures.conflict("DOCUMENT_STORAGE_ACCESS_DENIED", "Document storage access is denied or misconfigured");
            case "DOCUMENT_DOWNLOAD_PREPARATION_FAILED" -> DocumentFailures.conflict("DOCUMENT_DOWNLOAD_PREPARATION_FAILED", "Document download access could not be created");
            default -> DocumentFailures.conflict("DOCUMENT_STORAGE_UNAVAILABLE", "Document storage is unavailable");
        };
    }
}
