package com.digiaudit.grcpc.modules.document.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(MinioProperties.class)
public class DocumentStorageConfig {

    @Bean
    public MinioLifecycleManager minioLifecycleManager() {
        return new MinioLifecycleManager();
    }

    @Bean
    public MinioStorageInitializer minioStorageInitializer(
            ObjectProvider<MinioClient> clientProvider,
            MinioProperties properties,
            MinioLifecycleManager lifecycleManager
    ) {
        return new MinioStorageInitializer(clientProvider, properties, lifecycleManager);
    }

    @Bean
    @ConditionalOnProperty(prefix = "app.minio", name = "enabled", havingValue = "true")
    public MinioClient minioClient(MinioProperties properties) {
        return MinioClient.builder()
                .endpoint(properties.endpoint())
                .credentials(properties.accessKey(), properties.secretKey())
                .build();
    }
}
