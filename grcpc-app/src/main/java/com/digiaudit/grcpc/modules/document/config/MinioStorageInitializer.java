package com.digiaudit.grcpc.modules.document.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.ObjectProvider;

import java.util.Objects;

public class MinioStorageInitializer implements InitializingBean {
    private final ObjectProvider<MinioClient> clientProvider;
    private final MinioProperties properties;
    private final MinioLifecycleManager lifecycleManager;

    public MinioStorageInitializer(
            ObjectProvider<MinioClient> clientProvider,
            MinioProperties properties,
            MinioLifecycleManager lifecycleManager
    ) {
        this.clientProvider = Objects.requireNonNull(clientProvider, "clientProvider is required");
        this.properties = Objects.requireNonNull(properties, "properties is required");
        this.lifecycleManager = Objects.requireNonNull(lifecycleManager, "lifecycleManager is required");
    }

    @Override
    public void afterPropertiesSet() {
        if (!properties.enabled()) {
            return;
        }
        MinioClient client = clientProvider.getIfAvailable();
        if (client == null) {
            throw new IllegalStateException("MinIO is enabled but no MinioClient is configured");
        }
        try {
            boolean bucketExists = client.bucketExists(BucketExistsArgs.builder()
                    .bucket(properties.bucket())
                    .build());
            if (!bucketExists) {
                client.makeBucket(MakeBucketArgs.builder().bucket(properties.bucket()).build());
                bucketExists = client.bucketExists(BucketExistsArgs.builder()
                        .bucket(properties.bucket())
                        .build());
            }
            if (!bucketExists) {
                throw new IllegalStateException("Configured MinIO bucket could not be made accessible: " + properties.bucket());
            }
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException(
                    "Could not verify access to configured MinIO bucket " + properties.bucket(),
                    ex
            );
        }
        lifecycleManager.reconcile(client, properties);
    }
}
