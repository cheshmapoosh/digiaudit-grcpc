package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.modules.document.config.MinioProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

@Component
public class DocumentValidation {
    private static final String DEFAULT_MIME_TYPE = "application/octet-stream";
    private static final Pattern UNSAFE_FILE_CHARS = Pattern.compile("[\\\\/\\p{Cntrl}]");

    private final MinioProperties properties;

    public DocumentValidation(MinioProperties properties) {
        this.properties = Objects.requireNonNull(properties, "properties is required");
    }

    public SafeUploadMetadata validateUpload(MultipartFile file) {
        if (file == null) {
            throw DocumentFailures.invalid("INVALID_FILENAME", "One file is required");
        }
        long maxBytes = Math.max(1L, properties.defaultMaxUploadSizeMb()) * 1024L * 1024L;
        if (file.getSize() > maxBytes) {
            throw DocumentFailures.invalid("FILE_TOO_LARGE", "The uploaded file exceeds the configured maximum size");
        }
        String fileName = safeFileName(file.getOriginalFilename());
        String mimeType = safeMimeType(file.getContentType());
        return new SafeUploadMetadata(fileName, mimeType, file.getSize(), maxBytes);
    }

    public String safeFileName(String originalFileName) {
        String cleaned = StringUtils.cleanPath(originalFileName == null ? "" : originalFileName.trim());
        cleaned = UNSAFE_FILE_CHARS.matcher(cleaned).replaceAll("_");
        cleaned = cleaned.replaceAll("\\s+", " ");
        if (cleaned.isBlank() || ".".equals(cleaned) || "..".equals(cleaned) || cleaned.contains("..")) {
            throw DocumentFailures.invalid("INVALID_FILENAME", "Invalid document filename");
        }
        if (cleaned.length() > 512) {
            throw DocumentFailures.invalid("INVALID_FILENAME", "Document filename exceeds the database limit");
        }
        return cleaned;
    }

    public String safeMimeType(String contentType) {
        String normalized = contentType == null || contentType.isBlank()
                ? DEFAULT_MIME_TYPE
                : contentType.trim().toLowerCase(Locale.ROOT);
        if (normalized.length() > 255 || normalized.contains("\r") || normalized.contains("\n")) {
            throw DocumentFailures.invalid("INVALID_MIME_TYPE", "Invalid document MIME type");
        }
        return normalized;
    }

    public String nullableText(String value, int maxLength, String code, String label) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() > maxLength) {
            throw DocumentFailures.invalid(code, label + " exceeds the database limit");
        }
        return trimmed;
    }

    public String requiredText(String value, int maxLength, String code, String label) {
        String normalized = nullableText(value, maxLength, code, label);
        if (normalized == null) {
            throw DocumentFailures.invalid(code, label + " is required");
        }
        return normalized;
    }

    public void validateDateRange(LocalDate validFrom, LocalDate validTo) {
        if (validFrom != null && validTo != null && validFrom.isAfter(validTo)) {
            throw DocumentFailures.invalid("DATE_RANGE_INVALID", "Document validTo must be on or after validFrom");
        }
    }

    public void requireExpectedVersion(Long expectedVersion) {
        if (expectedVersion == null || expectedVersion < 0) {
            throw DocumentFailures.invalid("VERSION_CONFLICT", "A non-negative expected version is required");
        }
    }

    public record SafeUploadMetadata(String fileName, String mimeType, long fileSize, long maxFileSizeBytes) {
    }
}
