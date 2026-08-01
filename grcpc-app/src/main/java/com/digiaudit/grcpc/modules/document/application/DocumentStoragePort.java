package com.digiaudit.grcpc.modules.document.application;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;

public interface DocumentStoragePort {
    void uploadTemporaryObject(DocumentObjectUpload upload);

    DocumentObjectMetadata inspectObject(String objectKey);

    String calculateObjectChecksum(String objectKey, String checksumAlgorithm);

    PermanentObjectPromotionResult promoteTemporaryObject(String temporaryObjectKey, String permanentObjectKey, DocumentObjectMetadata expectedMetadata);

    void verifyPermanentObject(String permanentObjectKey, DocumentObjectMetadata expectedMetadata);

    DocumentDownloadAccess createDownloadAccess(String permanentObjectKey, String fileName, String mimeType);

    void removePermanentObjectBestEffort(String permanentObjectKey);

    void removeTemporaryObjectBestEffort(String temporaryObjectKey);

    @FunctionalInterface
    interface StreamSupplier {
        InputStream openStream() throws IOException;
    }

    record DocumentObjectUpload(
            String objectKey,
            String fileName,
            String mimeType,
            long fileSize,
            String checksumAlgorithm,
            String checksumValue,
            StreamSupplier streamSupplier
    ) {
    }

    record DocumentObjectMetadata(
            String mimeType,
            long fileSize,
            String checksumAlgorithm,
            String checksumValue
    ) {
    }

    record PermanentObjectPromotionResult(
            String permanentObjectKey,
            boolean createdByThisAttempt,
            DocumentObjectMetadata verifiedMetadata
    ) {
    }

    record DocumentDownloadAccess(
            String downloadUrl,
            Instant expiresAt
    ) {
    }
}
