package com.digiaudit.grcpc.modules.document.infrastructure.storage;

import com.digiaudit.grcpc.modules.document.application.DocumentStorageException;
import com.digiaudit.grcpc.modules.document.application.DocumentStoragePort;
import com.digiaudit.grcpc.modules.document.config.MinioProperties;
import io.minio.BucketExistsArgs;
import io.minio.CopyObjectArgs;
import io.minio.CopySource;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;
import io.minio.StatObjectResponse;
import io.minio.errors.ErrorResponseException;
import io.minio.http.Method;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

@Component
public class MinioDocumentStorageAdapter implements DocumentStoragePort {
    private static final String META_CHECKSUM_ALGORITHM = "checksum-algorithm";
    private static final String META_CHECKSUM_VALUE = "checksum-value";
    private static final String META_FILE_SIZE = "file-size";
    private static final String META_FILE_NAME = "original-file-name";

    private final ObjectProvider<MinioClient> minioClientProvider;
    private final MinioProperties properties;
    private final Clock clock;

    public MinioDocumentStorageAdapter(
            ObjectProvider<MinioClient> minioClientProvider,
            MinioProperties properties,
            @Qualifier("masterDataRevisionClock") Clock clock
    ) {
        this.minioClientProvider = Objects.requireNonNull(minioClientProvider, "minioClientProvider is required");
        this.properties = Objects.requireNonNull(properties, "properties is required");
        this.clock = Objects.requireNonNull(clock, "clock is required");
    }

    @Override
    public void uploadTemporaryObject(DocumentObjectUpload upload) {
        Objects.requireNonNull(upload, "upload is required");
        try {
            MinioClient client = client();
            ensureBucket(client);
            try (InputStream input = upload.streamSupplier().openStream()) {
                client.putObject(PutObjectArgs.builder()
                        .bucket(properties.bucket())
                        .object(upload.objectKey())
                        .stream(input, upload.fileSize(), -1)
                        .contentType(upload.mimeType())
                        .userMetadata(metadata(upload))
                        .build());
            }
        } catch (DocumentStorageException ex) {
            throw ex;
        } catch (Exception ex) {
            throw classifyStorageFailure(ex, "DOCUMENT_STORAGE_UNAVAILABLE", "Document temporary upload failed");
        }
    }

    @Override
    public DocumentObjectMetadata inspectObject(String objectKey) {
        try {
            StatObjectResponse stat = client().statObject(StatObjectArgs.builder()
                    .bucket(properties.bucket())
                    .object(objectKey)
                    .build());
            Map<String, String> metadata = lowerCaseKeys(stat.userMetadata());
            return new DocumentObjectMetadata(
                    normalizeMimeType(stat.contentType()),
                    stat.size(),
                    metadata.get(META_CHECKSUM_ALGORITHM),
                    metadata.get(META_CHECKSUM_VALUE)
            );
        } catch (DocumentStorageException ex) {
            throw ex;
        } catch (Exception ex) {
            throw classifyStorageFailure(ex, "DOCUMENT_STORAGE_UNAVAILABLE", "Document storage object could not be inspected");
        }
    }

    @Override
    public PermanentObjectPromotionResult promoteTemporaryObject(
            String temporaryObjectKey,
            String permanentObjectKey,
            DocumentObjectMetadata expectedMetadata
    ) {
        Objects.requireNonNull(temporaryObjectKey, "temporaryObjectKey is required");
        Objects.requireNonNull(permanentObjectKey, "permanentObjectKey is required");
        Objects.requireNonNull(expectedMetadata, "expectedMetadata is required");
        try {
            DocumentObjectMetadata existingPermanent = inspectObject(permanentObjectKey);
            verifyMetadata(existingPermanent, expectedMetadata, "PERMANENT_OBJECT_CONFLICT");
            return new PermanentObjectPromotionResult(permanentObjectKey, false, existingPermanent);
        } catch (DocumentStorageException ex) {
            if (!"DOCUMENT_OBJECT_MISSING".equals(ex.errorCode())) {
                throw ex;
            }
        }

        boolean copied = false;
        try {
            MinioClient client = client();
            ensureBucket(client);
            client.copyObject(CopyObjectArgs.builder()
                    .bucket(properties.bucket())
                    .object(permanentObjectKey)
                    .source(CopySource.builder()
                            .bucket(properties.bucket())
                            .object(temporaryObjectKey)
                            .build())
                    .build());
            copied = true;
            DocumentObjectMetadata verified = verifiedPermanentMetadata(permanentObjectKey, expectedMetadata);
            return new PermanentObjectPromotionResult(permanentObjectKey, true, verified);
        } catch (DocumentStorageException ex) {
            if (copied) {
                removeNewPermanentBestEffort(permanentObjectKey);
            }
            throw ex;
        } catch (Exception ex) {
            if (copied) {
                removeNewPermanentBestEffort(permanentObjectKey);
            }
            throw classifyStorageFailure(ex, "PERMANENT_PROMOTION_FAILURE", "Document permanent object promotion failed");
        }
    }

    @Override
    public void verifyPermanentObject(String permanentObjectKey, DocumentObjectMetadata expectedMetadata) {
        verifiedPermanentMetadata(permanentObjectKey, expectedMetadata);
    }

    @Override
    public DocumentDownloadAccess createDownloadAccess(String permanentObjectKey, String fileName, String mimeType) {
        int expiryMinutes = Math.max(1, properties.presignedUrlExpiryMinutes());
        try {
            if (!properties.enabled()) {
                throw new DocumentStorageException("DOCUMENT_STORAGE_DISABLED", "Document storage is disabled");
            }
            String url = presignedClient().getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(properties.bucket())
                    .object(permanentObjectKey)
                    .expiry(expiryMinutes, TimeUnit.MINUTES)
                    .build());
            return new DocumentDownloadAccess(url, Instant.now(clock).plus(Duration.ofMinutes(expiryMinutes)));
        } catch (DocumentStorageException ex) {
            throw ex;
        } catch (Exception ex) {
            throw classifyStorageFailure(ex, "DOCUMENT_DOWNLOAD_PREPARATION_FAILED", "Document download access could not be created");
        }
    }

    @Override
    public void removePermanentObjectBestEffort(String permanentObjectKey) {
        removeObject(permanentObjectKey);
    }

    @Override
    public void removeTemporaryObjectBestEffort(String temporaryObjectKey) {
        removeObject(temporaryObjectKey);
    }

    private DocumentObjectMetadata verifiedPermanentMetadata(String permanentObjectKey, DocumentObjectMetadata expectedMetadata) {
        DocumentObjectMetadata actual = inspectObject(permanentObjectKey);
        verifyMetadata(actual, expectedMetadata, "DOCUMENT_OBJECT_METADATA_MISMATCH");
        return actual;
    }

    private void removeNewPermanentBestEffort(String permanentObjectKey) {
        try {
            removeObject(permanentObjectKey);
        } catch (RuntimeException ignored) {
            // Rollback retry safety comes from the deterministic permanent key and metadata checks.
        }
    }

    private void removeObject(String objectKey) {
        try {
            client().removeObject(RemoveObjectArgs.builder()
                    .bucket(properties.bucket())
                    .object(objectKey)
                    .build());
        } catch (DocumentStorageException ex) {
            throw ex;
        } catch (Exception ex) {
            throw classifyStorageFailure(ex, "DOCUMENT_STORAGE_UNAVAILABLE", "Document storage object removal failed");
        }
    }

    private MinioClient client() {
        if (!properties.enabled()) {
            throw new DocumentStorageException("DOCUMENT_STORAGE_DISABLED", "Document storage is disabled");
        }
        MinioClient client = minioClientProvider.getIfAvailable();
        if (client == null) {
            throw new DocumentStorageException("DOCUMENT_STORAGE_DISABLED", "Document storage is not configured");
        }
        return client;
    }

    private MinioClient presignedClient() {
        String endpoint = properties.publicEndpoint() == null || properties.publicEndpoint().isBlank()
                ? properties.endpoint()
                : properties.publicEndpoint();
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(properties.accessKey(), properties.secretKey())
                .build();
    }

    private void ensureBucket(MinioClient client) throws Exception {
        boolean exists = client.bucketExists(BucketExistsArgs.builder()
                .bucket(properties.bucket())
                .build());
        if (!exists) {
            client.makeBucket(MakeBucketArgs.builder()
                    .bucket(properties.bucket())
                    .build());
        }
    }

    private Map<String, String> metadata(DocumentObjectUpload upload) {
        Map<String, String> metadata = new HashMap<>();
        metadata.put(META_CHECKSUM_ALGORITHM, upload.checksumAlgorithm());
        metadata.put(META_CHECKSUM_VALUE, upload.checksumValue());
        metadata.put(META_FILE_SIZE, Long.toString(upload.fileSize()));
        metadata.put(META_FILE_NAME, upload.fileName());
        return metadata;
    }

    private Map<String, String> lowerCaseKeys(Map<String, String> metadata) {
        Map<String, String> normalized = new HashMap<>();
        if (metadata == null) {
            return normalized;
        }
        metadata.forEach((key, value) -> {
            if (key != null && value != null) {
                normalized.put(key.toLowerCase(Locale.ROOT), value);
            }
        });
        return normalized;
    }

    private void verifyMetadata(DocumentObjectMetadata actual, DocumentObjectMetadata expected, String errorCode) {
        if (actual.fileSize() != expected.fileSize()
                || !sameText(actual.mimeType(), expected.mimeType())
                || !sameText(actual.checksumAlgorithm(), expected.checksumAlgorithm())
                || !sameText(actual.checksumValue(), expected.checksumValue())) {
            throw new DocumentStorageException(errorCode, "Document storage object metadata mismatch");
        }
    }

    private DocumentStorageException classifyStorageFailure(Exception ex, String fallbackCode, String message) {
        if (ex instanceof ErrorResponseException responseException) {
            String code = responseException.errorResponse() == null
                    ? ""
                    : responseException.errorResponse().code();
            if (isObjectNotFound(code)) {
                return new DocumentStorageException("DOCUMENT_OBJECT_MISSING", "Document storage object was not found", ex);
            }
            if (isAccessOrConfigurationFailure(code)) {
                return new DocumentStorageException("DOCUMENT_STORAGE_ACCESS_DENIED", "Document storage access is denied or misconfigured", ex);
            }
        }
        return new DocumentStorageException(fallbackCode, message, ex);
    }

    private boolean isObjectNotFound(String minioCode) {
        return "NoSuchKey".equals(minioCode)
                || "NoSuchObject".equals(minioCode)
                || "NotFound".equals(minioCode);
    }

    private boolean isAccessOrConfigurationFailure(String minioCode) {
        return "AccessDenied".equals(minioCode)
                || "InvalidAccessKeyId".equals(minioCode)
                || "SignatureDoesNotMatch".equals(minioCode)
                || "NoSuchBucket".equals(minioCode);
    }

    private static boolean sameText(String left, String right) {
        return Objects.equals(
                left == null ? null : left.trim(),
                right == null ? null : right.trim()
        );
    }

    private static String normalizeMimeType(String mimeType) {
        return mimeType == null || mimeType.isBlank()
                ? "application/octet-stream"
                : mimeType.trim().toLowerCase(Locale.ROOT);
    }
}
