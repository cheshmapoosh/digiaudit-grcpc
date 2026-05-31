package com.digiaudit.grcpc.modules.document.config;

import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

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
        Map<String, Long> featureMaxUploadSizeMb,
        long tempTtlMinutes,
        long tempCleanupFixedDelayMs
) {
}
