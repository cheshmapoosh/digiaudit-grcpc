package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.modules.document.config.MinioProperties;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Component
public class DocumentObjectKeyService {
    private final MinioProperties properties;

    public DocumentObjectKeyService(MinioProperties properties) {
        this.properties = Objects.requireNonNull(properties, "properties is required");
    }

    public String temporaryKey(UUID tempUploadId, String fileName) {
        return key(properties.temporaryPrefix(), tempUploadId, fileName);
    }

    public String permanentKey(UUID documentVersionId, String fileName) {
        return key(properties.permanentPrefix(), documentVersionId, fileName);
    }

    private String key(String configuredPrefix, UUID objectId, String fileName) {
        String prefix = normalizePrefix(configuredPrefix);
        String key = prefix + "/" + objectId + extension(fileName);
        if (key.length() > 1024) {
            throw DocumentFailures.invalid("INVALID_FILENAME", "Document object key exceeds the database limit");
        }
        return key;
    }

    private String normalizePrefix(String configuredPrefix) {
        String prefix = configuredPrefix == null || configuredPrefix.isBlank()
                ? "master-data/document"
                : configuredPrefix.trim();
        prefix = prefix.replace('\\', '/');
        while (prefix.startsWith("/")) {
            prefix = prefix.substring(1);
        }
        while (prefix.endsWith("/")) {
            prefix = prefix.substring(0, prefix.length() - 1);
        }
        return prefix.isBlank() ? "master-data/document" : prefix;
    }

    private String extension(String fileName) {
        if (fileName == null) {
            return "";
        }
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) {
            return "";
        }
        String ext = fileName.substring(dot + 1)
                .trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
        if (ext.isBlank()) {
            return "";
        }
        return "." + ext.substring(0, Math.min(ext.length(), 20));
    }
}
