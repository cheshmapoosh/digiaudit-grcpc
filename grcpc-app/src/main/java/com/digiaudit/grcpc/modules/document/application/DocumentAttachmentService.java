package com.digiaudit.grcpc.modules.document.application;

import static com.digiaudit.grcpc.common.util.Texts.normalizeRequired;

import com.digiaudit.grcpc.common.exception.BusinessException;
import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.ForbiddenException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentAttachmentResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommitRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentDownloadUrlResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentTitleUpdateRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentUploadPolicyResponse;
import com.digiaudit.grcpc.modules.document.api.mapper.DocumentAttachmentMapper;
import com.digiaudit.grcpc.modules.document.config.MinioProperties;
import com.digiaudit.grcpc.modules.document.domain.entity.DocumentAttachmentEntity;
import com.digiaudit.grcpc.modules.document.domain.entity.DocumentTempUploadEntity;
import com.digiaudit.grcpc.modules.document.domain.repository.DocumentAttachmentRepository;
import com.digiaudit.grcpc.modules.document.domain.repository.DocumentTempUploadRepository;
import com.digiaudit.grcpc.modules.securityacl.application.ResourceAuthorizationService;
import io.minio.*;
import io.minio.http.Method;
import jakarta.servlet.http.HttpServletRequest;
import java.io.InputStream;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DocumentAttachmentService {

    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_DELETED = "DELETED";
    private static final long BYTES_PER_MB = 1024L * 1024L;
    private static final int MAX_DOCUMENT_TITLE_LENGTH = 500;

    private final DocumentAttachmentRepository repository;
    private final DocumentTempUploadRepository tempUploadRepository;
    private final DocumentAttachmentMapper mapper;
    private final ObjectProvider<MinioClient> minioClientProvider;
    private final MinioProperties properties;
    private final ResourceAuthorizationService authorizationService;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<DocumentAttachmentResponse> list(String targetType, UUID targetId) {
        String safeTargetType = normalizeTargetType(targetType);
        authorizationService.assertCanAccess(safeTargetType, targetId, "DOCUMENT_VIEW");
        return repository.findByTargetTypeAndTargetIdAndStatusOrderByUploadedAtDesc(safeTargetType, targetId, STATUS_ACTIVE)
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    public List<DocumentAttachmentResponse> listTemp(String targetType, UUID tempSessionId) {
        String safeTargetType = normalizeTargetType(targetType);
        return tempUploadRepository
                .findByTargetTypeAndTempSessionIdOrderByUploadedAtDesc(safeTargetType, tempSessionId)
                .stream()
                .filter(this::canReadTempDocument)
                .map(mapper::toResponse)
                .toList();
    }

    public DocumentUploadPolicyResponse uploadPolicy(String targetType) {
        String safeTargetType = normalizeTargetType(targetType);
        long maxFileSizeMb = resolveMaxUploadSizeMb(safeTargetType);
        return new DocumentUploadPolicyResponse(
                safeTargetType,
                maxFileSizeMb * BYTES_PER_MB,
                maxFileSizeMb,
                Math.max(1, properties.tempTtlMinutes())
        );
    }

    @Transactional
    public DocumentAttachmentResponse upload(String targetType, UUID targetId, String title, MultipartFile file, HttpServletRequest httpRequest) {
        String safeTargetType = normalizeTargetType(targetType);
        authorizationService.assertCanAccess(safeTargetType, targetId, "DOCUMENT_UPLOAD");
        validateFileSize(safeTargetType, file);
        MinioClient client = minioClient();
        try {
            ensureBucket(client);
            String originalFileName = sanitizeFileName(file.getOriginalFilename());
            String documentTitle = normalizeDocumentTitle(title, originalFileName);
            String objectKey = finalObjectKey(safeTargetType, targetId, originalFileName);
            String checksum = sha256(file);
            try (InputStream inputStream = file.getInputStream()) {
                ObjectWriteResponse response = client.putObject(PutObjectArgs.builder()
                        .bucket(properties.bucket())
                        .object(objectKey)
                        .contentType(file.getContentType())
                        .stream(inputStream, file.getSize(), -1)
                        .build());
                DocumentAttachmentEntity entity = DocumentAttachmentEntity.builder()
                        .targetType(safeTargetType)
                        .targetId(targetId)
                        .bucketName(properties.bucket())
                        .objectKey(objectKey)
                        .originalFileName(originalFileName)
                        .title(documentTitle)
                        .contentType(file.getContentType())
                        .sizeBytes(file.getSize())
                        .checksumSha256(checksum)
                        .versionId(response.versionId())
                        .status(STATUS_ACTIVE)
                        .uploadedBy(currentUserProvider.getCurrentUserIdOrNull())
                        .uploadedAt(LocalDateTime.now())
                        .build();
                DocumentAttachmentEntity saved = repository.save(entity);
                audit("DOCUMENT_UPLOADED", saved.getId(), httpRequest, Map.of("targetType", safeTargetType, "targetId", targetId, "objectKey", objectKey, "title", documentTitle));
                return mapper.toResponse(saved);
            }
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to upload document. targetType={}, targetId={}, fileName={}", targetType, targetId, file.getOriginalFilename(), ex);
            throw new ConflictException("DOCUMENT_UPLOAD_FAILED", "error.internal", "Document upload failed: " + ex.getMessage());
        }
    }

    @Transactional
    public DocumentAttachmentResponse uploadTemp(
            String targetType,
            UUID targetId,
            UUID tempSessionId,
            String title,
            MultipartFile file,
            HttpServletRequest httpRequest
    ) {
        String safeTargetType = normalizeTargetType(targetType);
        if (targetId != null) {
            authorizationService.assertCanAccess(safeTargetType, targetId, "DOCUMENT_UPLOAD");
        }
        validateFileSize(safeTargetType, file);
        MinioClient client = minioClient();
        try {
            ensureBucket(client);
            String originalFileName = sanitizeFileName(file.getOriginalFilename());
            String documentTitle = normalizeDocumentTitle(title, originalFileName);
            String objectKey = tempObjectKey(safeTargetType, tempSessionId, originalFileName);
            String checksum = sha256(file);
            LocalDateTime now = LocalDateTime.now();
            try (InputStream inputStream = file.getInputStream()) {
                ObjectWriteResponse response = client.putObject(PutObjectArgs.builder()
                        .bucket(properties.bucket())
                        .object(objectKey)
                        .contentType(file.getContentType())
                        .stream(inputStream, file.getSize(), -1)
                        .build());
                DocumentTempUploadEntity entity = DocumentTempUploadEntity.builder()
                        .tempSessionId(tempSessionId)
                        .targetType(safeTargetType)
                        .targetId(targetId)
                        .bucketName(properties.bucket())
                        .objectKey(objectKey)
                        .originalFileName(originalFileName)
                        .title(documentTitle)
                        .contentType(file.getContentType())
                        .sizeBytes(file.getSize())
                        .checksumSha256(checksum)
                        .versionId(response.versionId())
                        .uploadedBy(currentUserProvider.getCurrentUserIdOrNull())
                        .uploadedAt(now)
                        .expiresAt(now.plusMinutes(Math.max(1, properties.tempTtlMinutes())))
                        .build();
                DocumentTempUploadEntity saved = tempUploadRepository.save(entity);
                audit("DOCUMENT_TEMP_UPLOADED", saved.getId(), httpRequest, Map.of(
                        "targetType", safeTargetType,
                        "targetId", targetId == null ? "" : targetId.toString(),
                        "tempSessionId", tempSessionId,
                        "objectKey", objectKey,
                        "title", documentTitle
                ));
                return mapper.toResponse(saved);
            }
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to upload temp document. targetType={}, tempSessionId={}, fileName={}", targetType, tempSessionId, file.getOriginalFilename(), ex);
            throw new ConflictException("DOCUMENT_UPLOAD_FAILED", "error.internal", "Document upload failed: " + ex.getMessage());
        }
    }

    @Transactional
    public List<DocumentAttachmentResponse> commitTemp(
            DocumentCommitRequest request,
            HttpServletRequest httpRequest
    ) {
        String safeTargetType = normalizeTargetType(request.targetType());
        authorizationService.assertCanAccess(safeTargetType, request.targetId(), "DOCUMENT_UPLOAD");
        MinioClient client = minioClient();
        try {
            ensureBucket(client);
            List<UUID> requestedIds = request.documentIds() == null ? List.of() : request.documentIds();
            Map<UUID, String> requestedTitles = request.documentTitles() == null ? Map.of() : request.documentTitles();
            LocalDateTime now = LocalDateTime.now();
            List<DocumentTempUploadEntity> tempDocuments = tempUploadRepository
                    .findByTempSessionId(request.tempSessionId())
                    .stream()
                    .filter(item -> safeTargetType.equals(item.getTargetType()))
                    .filter(item -> requestedIds.isEmpty() || requestedIds.contains(item.getId()))
                    .toList();

            if (!requestedIds.isEmpty()) {
                List<UUID> foundIds = tempDocuments.stream()
                        .map(DocumentTempUploadEntity::getId)
                        .toList();
                List<UUID> missingIds = requestedIds.stream()
                        .filter(id -> !foundIds.contains(id))
                        .toList();
                if (!missingIds.isEmpty()) {
                    throw new NotFoundException(
                            "DOCUMENT_TEMP_NOT_FOUND",
                            "error.document.notFound",
                            "Temp documents not found for session " + request.tempSessionId(),
                            request.tempSessionId()
                    );
                }
            }

            if (tempDocuments.isEmpty()) {
                return List.of();
            }

            for (DocumentTempUploadEntity entity : tempDocuments) {
                if (!canMutateTempDocument(entity)) {
                    throw new ForbiddenException(
                            "RESOURCE_ACCESS_DENIED",
                            "error.security.forbidden",
                            "Access denied for temp document " + entity.getId()
                    );
                }
            }

            List<DocumentAttachmentEntity> committedDocuments = tempDocuments.stream()
                    .map(entity -> commitTempDocument(
                            client,
                            safeTargetType,
                            request.targetId(),
                            requestedTitles.get(entity.getId()),
                            now,
                            entity
                    ))
                    .toList();

            List<DocumentAttachmentEntity> saved = repository.saveAll(committedDocuments);
            tempUploadRepository.deleteAll(tempDocuments);
            saved.forEach(item -> audit("DOCUMENT_TEMP_COMMITTED", item.getId(), httpRequest, Map.of(
                    "targetType", item.getTargetType(),
                    "targetId", item.getTargetId(),
                    "tempSessionId", request.tempSessionId(),
                    "objectKey", item.getObjectKey()
            )));

            for (DocumentTempUploadEntity entity : tempDocuments) {
                removeObjectQuietly(client, entity.getBucketName(), entity.getObjectKey());
            }

            return saved.stream().map(mapper::toResponse).toList();
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to commit temp documents. targetType={}, targetId={}, tempSessionId={}", request.targetType(), request.targetId(), request.tempSessionId(), ex);
            throw new ConflictException("DOCUMENT_COMMIT_FAILED", "error.internal", "Document commit failed: " + ex.getMessage());
        }
    }

    private DocumentAttachmentEntity commitTempDocument(
            MinioClient client,
            String targetType,
            UUID targetId,
            String requestedTitle,
            LocalDateTime committedAt,
            DocumentTempUploadEntity tempDocument
    ) {
        try {
            String documentTitle = requestedTitle != null
                    ? normalizeDocumentTitle(requestedTitle, tempDocument.getOriginalFileName())
                    : normalizeDocumentTitle(tempDocument.getTitle(), tempDocument.getOriginalFileName());
            String finalObjectKey = finalObjectKey(
                    targetType,
                    targetId,
                    tempDocument.getOriginalFileName()
            );
            ObjectWriteResponse copyResponse = client.copyObject(CopyObjectArgs.builder()
                    .bucket(properties.bucket())
                    .object(finalObjectKey)
                    .source(CopySource.builder()
                            .bucket(tempDocument.getBucketName())
                            .object(tempDocument.getObjectKey())
                            .build())
                    .build());

            return DocumentAttachmentEntity.builder()
                    .targetType(targetType)
                    .targetId(targetId)
                    .bucketName(properties.bucket())
                    .objectKey(finalObjectKey)
                    .originalFileName(tempDocument.getOriginalFileName())
                    .title(documentTitle)
                    .contentType(tempDocument.getContentType())
                    .sizeBytes(tempDocument.getSizeBytes())
                    .checksumSha256(tempDocument.getChecksumSha256())
                    .versionId(copyResponse.versionId())
                    .status(STATUS_ACTIVE)
                    .uploadedBy(tempDocument.getUploadedBy())
                    .uploadedAt(tempDocument.getUploadedAt())
                    .committedAt(committedAt)
                    .build();
        } catch (Exception ex) {
            log.error("Failed to copy temp document to final path. tempDocumentId={}, objectKey={}", tempDocument.getId(), tempDocument.getObjectKey(), ex);
            throw new ConflictException("DOCUMENT_COMMIT_FAILED", "error.internal", "Document commit failed: " + ex.getMessage());
        }
    }

    @Transactional
    public DocumentAttachmentResponse updateTitle(
            UUID id,
            DocumentTitleUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        DocumentAttachmentEntity entity = repository.findById(id).orElse(null);

        if (entity == null) {
            return updateTempTitle(id, request, httpRequest);
        }

        if (!STATUS_ACTIVE.equals(entity.getStatus())) {
            throw new NotFoundException("DOCUMENT_NOT_FOUND", "error.document.notFound", "Document is not active: " + id, id);
        }

        authorizationService.assertCanAccess(entity.getTargetType(), entity.getTargetId(), "DOCUMENT_UPLOAD");

        String nextTitle = normalizeDocumentTitle(request == null ? null : request.title(), entity.getOriginalFileName());
        entity.setTitle(nextTitle);
        DocumentAttachmentEntity saved = repository.save(entity);
        audit("DOCUMENT_TITLE_UPDATED", id, httpRequest, Map.of(
                "targetType", entity.getTargetType(),
                "targetId", entity.getTargetId(),
                "title", nextTitle
        ));
        return mapper.toResponse(saved);
    }

    private DocumentAttachmentResponse updateTempTitle(
            UUID id,
            DocumentTitleUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        DocumentTempUploadEntity entity = tempUploadRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("DOCUMENT_NOT_FOUND", "error.document.notFound", "Document not found: " + id, id));

        if (!canMutateTempDocument(entity)) {
            throw new ForbiddenException(
                    "RESOURCE_ACCESS_DENIED",
                    "error.security.forbidden",
                    "Access denied for temp document " + id
            );
        }

        String nextTitle = normalizeDocumentTitle(request == null ? null : request.title(), entity.getOriginalFileName());
        entity.setTitle(nextTitle);
        DocumentTempUploadEntity saved = tempUploadRepository.save(entity);
        audit("DOCUMENT_TEMP_TITLE_UPDATED", id, httpRequest, Map.of(
                "targetType", entity.getTargetType(),
                "targetId", entity.getTargetId() == null ? "" : entity.getTargetId().toString(),
                "tempSessionId", entity.getTempSessionId(),
                "title", nextTitle
        ));
        return mapper.toResponse(saved);
    }

    public DocumentDownloadUrlResponse createDownloadUrl(UUID id) {
        DocumentAttachmentEntity entity = getActive(id);
        authorizationService.assertCanAccess(entity.getTargetType(), entity.getTargetId(), "DOCUMENT_DOWNLOAD");
        MinioClient client = presignedUrlClient();
        try {
            int expiryMinutes = Math.max(1, properties.presignedUrlExpiryMinutes());
            String url = client.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(entity.getBucketName())
                    .object(entity.getObjectKey())
                    .expiry(expiryMinutes, TimeUnit.MINUTES)
                    .build());
            return new DocumentDownloadUrlResponse(url, LocalDateTime.now().plusMinutes(expiryMinutes));
        } catch (Exception ex) {
            log.error("Failed to create document download URL. documentId={}", id, ex);
            throw new ConflictException("DOCUMENT_DOWNLOAD_URL_FAILED", "error.internal", "Document download URL failed: " + ex.getMessage());
        }
    }

    @Transactional
    public void delete(UUID id, HttpServletRequest httpRequest) {
        DocumentAttachmentEntity entity = repository.findById(id).orElse(null);
        if (entity == null) {
            deleteTempUpload(id, httpRequest);
            return;
        }

        if (!STATUS_ACTIVE.equals(entity.getStatus())) {
            throw new NotFoundException(
                    "DOCUMENT_NOT_FOUND",
                    "error.document.notFound",
                    "Document is not active: " + id,
                    id
            );
        }
        authorizationService.assertCanAccess(entity.getTargetType(), entity.getTargetId(), "DOCUMENT_DELETE");
        MinioClient client = minioClient();
        removeObjectQuietly(client, entity.getBucketName(), entity.getObjectKey());
        entity.setStatus(STATUS_DELETED);
        entity.setExpiresAt(null);
        repository.save(entity);
        audit("DOCUMENT_DELETED", id, httpRequest, Map.of("targetType", entity.getTargetType(), "targetId", entity.getTargetId(), "objectKey", entity.getObjectKey()));
    }

    private void deleteTempUpload(UUID id, HttpServletRequest httpRequest) {
        DocumentTempUploadEntity entity = tempUploadRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("DOCUMENT_NOT_FOUND", "error.document.notFound", "Document not found: " + id, id));
        if (!canMutateTempDocument(entity)) {
            throw new ForbiddenException(
                    "RESOURCE_ACCESS_DENIED",
                    "error.security.forbidden",
                    "Access denied for temp document " + id
            );
        }

        MinioClient client = minioClient();
        removeObjectQuietly(client, entity.getBucketName(), entity.getObjectKey());
        tempUploadRepository.delete(entity);
        audit("DOCUMENT_TEMP_DELETED", id, httpRequest, Map.of(
                "targetType", entity.getTargetType(),
                "targetId", entity.getTargetId() == null ? "" : entity.getTargetId().toString(),
                "tempSessionId", entity.getTempSessionId(),
                "objectKey", entity.getObjectKey()
        ));
    }

    @Scheduled(
            fixedDelayString = "${app.minio.temp-cleanup-fixed-delay-ms:3600000}",
            initialDelayString = "${app.minio.temp-cleanup-fixed-delay-ms:3600000}"
    )
    @Transactional
    public void cleanupExpiredTempDocuments() {
        List<DocumentTempUploadEntity> expired = tempUploadRepository.findByExpiresAtBefore(
                LocalDateTime.now()
        );
        if (expired.isEmpty()) {
            return;
        }

        MinioClient client = minioClientProvider.getIfAvailable();
        for (DocumentTempUploadEntity entity : expired) {
            if (client != null && properties.enabled()) {
                removeObjectQuietly(client, entity.getBucketName(), entity.getObjectKey());
            }
        }
        tempUploadRepository.deleteAll(expired);
        log.info("Cleaned up expired temp documents. count={}", expired.size());
    }

    private DocumentAttachmentEntity getActive(UUID id) {
        DocumentAttachmentEntity entity = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("DOCUMENT_NOT_FOUND", "error.document.notFound", "Document not found: " + id, id));
        if (!STATUS_ACTIVE.equals(entity.getStatus())) {
            throw new NotFoundException("DOCUMENT_NOT_FOUND", "error.document.notFound", "Document is not active: " + id, id);
        }
        return entity;
    }

    private MinioClient minioClient() {
        MinioClient client = minioClientProvider.getIfAvailable();
        if (client == null || !properties.enabled()) {
            throw new ConflictException("DOCUMENT_STORAGE_DISABLED", "error.document.minioDisabled", "MinIO is disabled or not configured");
        }
        return client;
    }

    private MinioClient presignedUrlClient() {
        minioClient();
        String endpoint = properties.publicEndpoint() == null || properties.publicEndpoint().isBlank()
                ? properties.endpoint()
                : properties.publicEndpoint();
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(properties.accessKey(), properties.secretKey())
                .build();
    }

    private void ensureBucket(MinioClient client) throws Exception {
        boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(properties.bucket()).build());
        if (!exists) {
            client.makeBucket(MakeBucketArgs.builder().bucket(properties.bucket()).build());
        }
    }

    private String normalizeTargetType(String targetType) {
        return normalizeRequired(targetType).toUpperCase();
    }

    private String sanitizeFileName(String fileName) {
        return normalizeRequired(fileName)
                .replace('\\', '_')
                .replace('/', '_');
    }

    private String normalizeDocumentTitle(String title, String fallbackTitle) {
        String normalized = title == null ? "" : title.trim();
        if (normalized.isBlank()) {
            normalized = normalizeRequired(fallbackTitle);
        }

        if (normalized.length() > MAX_DOCUMENT_TITLE_LENGTH) {
            throw new ConflictException(
                    "DOCUMENT_TITLE_TOO_LONG",
                    "error.document.titleTooLong",
                    "Document title exceeds max length: " + MAX_DOCUMENT_TITLE_LENGTH
            );
        }

        return normalized;
    }

    private String finalObjectKey(String targetType, UUID targetId, String originalFileName) {
        return "%s/%s/%s/%s".formatted(targetType, targetId, UUID.randomUUID(), originalFileName);
    }

    private String tempObjectKey(String targetType, UUID tempSessionId, String originalFileName) {
        return "temp/%s/%s/%s/%s".formatted(targetType, tempSessionId, UUID.randomUUID(), originalFileName);
    }

    private long resolveMaxUploadSizeMb(String targetType) {
        long defaultSize = properties.defaultMaxUploadSizeMb() > 0
                ? properties.defaultMaxUploadSizeMb()
                : 20;
        Map<String, Long> featureSizes = properties.featureMaxUploadSizeMb();
        if (featureSizes == null || featureSizes.isEmpty()) {
            return defaultSize;
        }

        Long targetSize = featureSizes.get(targetType);
        return targetSize != null && targetSize > 0 ? targetSize : defaultSize;
    }

    private void validateFileSize(String targetType, MultipartFile file) {
        long maxUploadSizeMb = resolveMaxUploadSizeMb(targetType);
        long maxUploadSizeBytes = maxUploadSizeMb * BYTES_PER_MB;
        if (file.getSize() > maxUploadSizeBytes) {
            throw new ConflictException(
                    "DOCUMENT_FILE_TOO_LARGE",
                    "error.document.fileTooLarge",
                    "Document exceeds max upload size for " + targetType + ": " + maxUploadSizeMb + " MB"
            );
        }
    }

    private boolean canReadTempDocument(DocumentTempUploadEntity entity) {
        return canMutateTempDocument(entity);
    }

    private boolean canMutateTempDocument(DocumentTempUploadEntity entity) {
        return currentUserProvider.getCurrentPrincipalOptional()
                .map(currentUser -> currentUser.isRootUser()
                        || entity.getUploadedBy() == null
                        || Objects.equals(currentUser.getUserId(), entity.getUploadedBy()))
                .orElse(false);
    }

    private void removeObjectQuietly(MinioClient client, String bucketName, String objectKey) {
        try {
            client.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .build());
        } catch (Exception ex) {
            log.warn("MinIO object removal failed. bucket={}, objectKey={}, error={}", bucketName, objectKey, ex.getMessage());
        }
    }

    private String sha256(MultipartFile file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream inputStream = file.getInputStream()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private void audit(String eventName, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        Map<String, Object> safeDetails = new LinkedHashMap<>();
        safeDetails.put("event", eventName);
        safeDetails.putAll(details);
        auditService.log(AuditEventType.DOCUMENT_CHANGED, AuditTargetType.DOCUMENT, targetId.toString(), ActionResult.SUCCESS, currentUserProvider.getCurrentUserIdOrNull(), request, safeDetails);
    }
}
