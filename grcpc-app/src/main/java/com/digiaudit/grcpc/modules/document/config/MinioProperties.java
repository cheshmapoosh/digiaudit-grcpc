package com.digiaudit.grcpc.modules.document.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigInteger;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@ConfigurationProperties(prefix = "app.minio")
public record MinioProperties(
        boolean enabled,
        String endpoint,
        String publicEndpoint,
        String accessKey,
        String secretKey,
        String bucket,
        int presignedUrlExpiryMinutes,
        long defaultMaxUploadSizeMb,
        long tempTtlMinutes,
        String temporaryPrefix,
        String permanentPrefix,
        Lifecycle lifecycle
) {
    public static final String TEMP_EXPIRATION_RULE_ID = "grcpc-temp-object-expiration";
    public static final String OBSOLETE_INCOMPLETE_MULTIPART_RULE_ID = "grcpc-temp-incomplete-multipart-cleanup";

    public MinioProperties {
        requirePositive(presignedUrlExpiryMinutes, "app.minio.presigned-url-expiry-minutes");
        requirePositive(defaultMaxUploadSizeMb, "app.minio.default-max-upload-size-mb");
        requirePositive(tempTtlMinutes, "app.minio.temp-ttl-minutes");
        requireText(bucket, "app.minio.bucket");
        requireText(temporaryPrefix, "app.minio.temporary-prefix");
        requireText(permanentPrefix, "app.minio.permanent-prefix");
        if (lifecycle == null) {
            throw invalid("app.minio.lifecycle is required");
        }
        if (lifecycle.tempExpiration().enabled()
                && BigInteger.valueOf(lifecycle.tempExpiration().expireDays())
                .multiply(BigInteger.valueOf(24L * 60L))
                .compareTo(BigInteger.valueOf(tempTtlMinutes)) <= 0) {
            throw invalid("temporary-object physical expiration must be greater than the temporary-upload business TTL");
        }

        String normalizedTemporary = normalizePrefix(temporaryPrefix);
        String normalizedPermanent = normalizePrefix(permanentPrefix);
        if (normalizedTemporary.equals(normalizedPermanent)
                || normalizedTemporary.startsWith(normalizedPermanent)
                || normalizedPermanent.startsWith(normalizedTemporary)) {
            throw invalid("app.minio temporary and permanent prefixes must be safely distinct and non-overlapping");
        }

        if (enabled) {
            requireText(accessKey, "app.minio.access-key");
            requireText(secretKey, "app.minio.secret-key");
        }
        requireHttpUri(endpoint, "app.minio.endpoint");
        requireHttpUri(publicEndpoint, "app.minio.public-endpoint");
    }

    public String normalizedTemporaryPrefix() {
        return normalizePrefix(temporaryPrefix);
    }

    public String normalizedPermanentPrefix() {
        return normalizePrefix(permanentPrefix);
    }

    @Override
    public String toString() {
        return "MinioProperties[enabled=" + enabled
                + ", endpoint=" + endpoint
                + ", publicEndpoint=" + publicEndpoint
                + ", accessKey=***, secretKey=***"
                + ", bucket=" + bucket
                + ", presignedUrlExpiryMinutes=" + presignedUrlExpiryMinutes
                + ", defaultMaxUploadSizeMb=" + defaultMaxUploadSizeMb
                + ", tempTtlMinutes=" + tempTtlMinutes
                + ", temporaryPrefix=" + temporaryPrefix
                + ", permanentPrefix=" + permanentPrefix
                + ", lifecycle=" + lifecycle + "]";
    }

    private static String normalizePrefix(String value) {
        String normalized = value == null ? "" : value.trim().replace('\\', '/');
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        List<String> segments = new ArrayList<>();
        for (String segment : normalized.split("/+")) {
            if (segment.isBlank()) {
                continue;
            }
            if (segment.equals(".") || segment.equals("..")) {
                throw invalid("MinIO object prefixes must not contain relative path segments");
            }
            segments.add(segment);
        }
        if (segments.isEmpty()) {
            throw invalid("MinIO object prefixes must be nonblank relative object-key prefixes");
        }
        return String.join("/", segments) + "/";
    }

    private static void requireHttpUri(String value, String property) {
        requireText(value, property);
        try {
            URI uri = new URI(value.trim());
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            if (!(scheme.equals("http") || scheme.equals("https")) || uri.getHost() == null) {
                throw invalid(property + " must be an absolute HTTP(S) URI");
            }
        } catch (URISyntaxException ex) {
            throw invalid(property + " must be a valid absolute URI");
        }
    }

    private static void requireText(String value, String property) {
        if (value == null || value.isBlank()) {
            throw invalid(property + " must not be blank");
        }
    }

    private static void requirePositive(long value, String property) {
        if (value <= 0) {
            throw invalid(property + " must be greater than zero");
        }
    }

    private static IllegalArgumentException invalid(String message) {
        return new IllegalArgumentException("Invalid MinIO configuration: " + message);
    }

    public enum LifecycleMode {
        DISABLED,
        VALIDATE,
        APPLY
    }

    public record Lifecycle(
            LifecycleMode mode,
            TempExpiration tempExpiration
    ) {
        public Lifecycle {
            if (mode == null) {
                throw invalid("app.minio.lifecycle.mode is required");
            }
            if (tempExpiration == null) {
                throw invalid("app.minio.lifecycle.temp-expiration is required");
            }
            requireText(tempExpiration.ruleId(), "app.minio.lifecycle.temp-expiration.rule-id");
            if (!TEMP_EXPIRATION_RULE_ID.equals(tempExpiration.ruleId())) {
                throw invalid("the temporary expiration lifecycle rule ID must be " + TEMP_EXPIRATION_RULE_ID);
            }
            if (tempExpiration.expireDays() < 1) {
                throw invalid("app.minio.lifecycle.temp-expiration.expire-days must be at least 1");
            }
        }
    }

    public record TempExpiration(boolean enabled, String ruleId, int expireDays) {
    }
}
