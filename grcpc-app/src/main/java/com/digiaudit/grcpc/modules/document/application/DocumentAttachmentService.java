package com.digiaudit.grcpc.modules.document.application;

import static com.digiaudit.grcpc.common.util.Texts.normalizeRequired;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentAttachmentResponse;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentDownloadUrlResponse;
import com.digiaudit.grcpc.modules.document.api.mapper.DocumentAttachmentMapper;
import com.digiaudit.grcpc.modules.document.config.MinioProperties;
import com.digiaudit.grcpc.modules.document.domain.entity.DocumentAttachmentEntity;
import com.digiaudit.grcpc.modules.document.domain.repository.DocumentAttachmentRepository;
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
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DocumentAttachmentService {

    private final DocumentAttachmentRepository repository;
    private final DocumentAttachmentMapper mapper;
    private final ObjectProvider<MinioClient> minioClientProvider;
    private final MinioProperties properties;
    private final ResourceAuthorizationService authorizationService;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<DocumentAttachmentResponse> list(String targetType, UUID targetId) {
        authorizationService.assertCanAccess(targetType, targetId, "DOCUMENT_VIEW");
        return repository.findByTargetTypeAndTargetIdAndStatusOrderByUploadedAtDesc(targetType, targetId, "ACTIVE")
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional
    public DocumentAttachmentResponse upload(String targetType, UUID targetId, MultipartFile file, HttpServletRequest httpRequest) {
        authorizationService.assertCanAccess(targetType, targetId, "DOCUMENT_UPLOAD");
        MinioClient client = presignedUrlClient();
        try {
            ensureBucket(client);
            String safeTargetType = normalizeRequired(targetType);
            String originalFileName = normalizeRequired(file.getOriginalFilename());
            String objectKey = "%s/%s/%s/%s".formatted(safeTargetType, targetId, UUID.randomUUID(), originalFileName);
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
                        .contentType(file.getContentType())
                        .sizeBytes(file.getSize())
                        .checksumSha256(checksum)
                        .versionId(response.versionId())
                        .status("ACTIVE")
                        .uploadedBy(currentUserProvider.getCurrentUserIdOrNull())
                        .uploadedAt(LocalDateTime.now())
                        .build();
                DocumentAttachmentEntity saved = repository.save(entity);
                audit("DOCUMENT_UPLOADED", saved.getId(), httpRequest, Map.of("targetType", safeTargetType, "targetId", targetId, "objectKey", objectKey));
                return mapper.toResponse(saved);
            }
        } catch (Exception ex) {
            log.error("Failed to upload document. targetType={}, targetId={}, fileName={}", targetType, targetId, file.getOriginalFilename(), ex);
            throw new ConflictException("DOCUMENT_UPLOAD_FAILED", "error.internal", "Document upload failed: " + ex.getMessage());
        }
    }

    public DocumentDownloadUrlResponse createDownloadUrl(UUID id) {
        DocumentAttachmentEntity entity = getActive(id);
        authorizationService.assertCanAccess(entity.getTargetType(), entity.getTargetId(), "DOCUMENT_DOWNLOAD");
        MinioClient client = minioClient();
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
        DocumentAttachmentEntity entity = getActive(id);
        authorizationService.assertCanAccess(entity.getTargetType(), entity.getTargetId(), "DOCUMENT_DELETE");
        MinioClient client = minioClient();
        try {
            client.removeObject(RemoveObjectArgs.builder()
                    .bucket(entity.getBucketName())
                    .object(entity.getObjectKey())
                    .build());
        } catch (Exception ex) {
            log.warn("MinIO object removal failed, metadata will be marked deleted. documentId={}, objectKey={}, error={}", id, entity.getObjectKey(), ex.getMessage());
        }
        entity.setStatus("DELETED");
        repository.save(entity);
        audit("DOCUMENT_DELETED", id, httpRequest, Map.of("targetType", entity.getTargetType(), "targetId", entity.getTargetId(), "objectKey", entity.getObjectKey()));
    }

    private DocumentAttachmentEntity getActive(UUID id) {
        DocumentAttachmentEntity entity = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("DOCUMENT_NOT_FOUND", "error.document.notFound", "Document not found: " + id, id));
        if (!"ACTIVE".equals(entity.getStatus())) {
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
