package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentTemporaryUploadResponse;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentTempUploadEntity;
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
    private final DocumentChecksumService checksumService;
    private final DocumentObjectKeyService objectKeyService;
    private final DocumentTempUploadStateService stateService;
    private final DocumentStoragePort storagePort;
    private final DocumentResponseMapper responseMapper;
    private final com.digiaudit.grcpc.modules.document.config.MinioProperties properties;
    private final Clock clock;

    public DocumentTemporaryUploadService(
            CurrentUserProvider currentUserProvider,
            DocumentValidation validation,
            DocumentChecksumService checksumService,
            DocumentObjectKeyService objectKeyService,
            DocumentTempUploadStateService stateService,
            DocumentStoragePort storagePort,
            DocumentResponseMapper responseMapper,
            com.digiaudit.grcpc.modules.document.config.MinioProperties properties,
            @Qualifier("masterDataRevisionClock") Clock clock
    ) {
        this.currentUserProvider = Objects.requireNonNull(currentUserProvider, "currentUserProvider is required");
        this.validation = Objects.requireNonNull(validation, "validation is required");
        this.checksumService = Objects.requireNonNull(checksumService, "checksumService is required");
        this.objectKeyService = Objects.requireNonNull(objectKeyService, "objectKeyService is required");
        this.stateService = Objects.requireNonNull(stateService, "stateService is required");
        this.storagePort = Objects.requireNonNull(storagePort, "storagePort is required");
        this.responseMapper = Objects.requireNonNull(responseMapper, "responseMapper is required");
        this.properties = Objects.requireNonNull(properties, "properties is required");
        this.clock = Objects.requireNonNull(clock, "clock is required");
    }

    public DocumentTemporaryUploadResponse upload(MultipartFile file) {
        UUID actorId = currentUserProvider.getCurrentUserIdOptional()
                .orElseThrow(() -> DocumentFailures.forbidden("DOCUMENT_ACTOR_REQUIRED", "Authenticated user is required"));
        DocumentValidation.SafeUploadMetadata safeUpload = validation.validateUpload(file);
        String checksum = checksumService.sha256(file);
        UUID tempUploadId = UUID.randomUUID();
        String temporaryObjectKey = objectKeyService.temporaryKey(tempUploadId, safeUpload.fileName());
        Instant uploadedAt = Instant.now(clock);
        Instant expiresAt = uploadedAt.plus(Duration.ofMinutes(Math.max(1L, properties.tempTtlMinutes())));

        DocumentTempUploadEntity uploading = DocumentTempUploadEntity.uploading(
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
        stateService.createUploading(uploading);

        try {
            storagePort.uploadTemporaryObject(new DocumentStoragePort.DocumentObjectUpload(
                    temporaryObjectKey,
                    safeUpload.fileName(),
                    safeUpload.mimeType(),
                    safeUpload.fileSize(),
                    DocumentChecksumService.SHA_256,
                    checksum,
                    file::getInputStream
            ));
            verifyStorageMetadata(storagePort.inspectObject(temporaryObjectKey), uploading);
            DocumentTempUploadEntity available = stateService.markAvailable(tempUploadId, Instant.now(clock));
            return responseMapper.toTemporaryUploadResponse(available);
        } catch (DocumentStorageException ex) {
            markFailedAndRemoveTemporary(tempUploadId, temporaryObjectKey);
            throw storageFailure(ex);
        } catch (RuntimeException ex) {
            markFailedAndRemoveTemporary(tempUploadId, temporaryObjectKey);
            throw ex;
        }
    }

    public DocumentTemporaryUploadResponse get(UUID tempUploadId) {
        return responseMapper.toTemporaryUploadResponse(stateService.inspectOwnerScoped(tempUploadId));
    }

    private void verifyStorageMetadata(
            DocumentStoragePort.DocumentObjectMetadata actual,
            DocumentTempUploadEntity expected
    ) {
        if (actual.fileSize() != expected.getFileSize()
                || !Objects.equals(actual.mimeType(), expected.getMimeType())
                || !Objects.equals(actual.checksumAlgorithm(), expected.getChecksumAlgorithm())
                || !Objects.equals(actual.checksumValue(), expected.getChecksumValue())) {
            throw new DocumentStorageException("TEMPORARY_OBJECT_METADATA_MISMATCH", "Temporary upload metadata mismatch");
        }
    }

    private void markFailedAndRemoveTemporary(UUID tempUploadId, String temporaryObjectKey) {
        try {
            stateService.markFailed(tempUploadId);
        } catch (RuntimeException failedUpdate) {
            log.warn("Could not mark temporary document upload as failed. tempUploadId={}", tempUploadId);
        }
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
