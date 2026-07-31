package com.digiaudit.grcpc.modules.document.application;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Objects;
import java.util.UUID;

@Slf4j
@Component
public class DocumentPromotionRollbackRegistry {
    private final DocumentStoragePort storagePort;

    public DocumentPromotionRollbackRegistry(DocumentStoragePort storagePort) {
        this.storagePort = Objects.requireNonNull(storagePort, "storagePort is required");
    }

    public void removePermanentObjectOnRollback(String permanentObjectKey, UUID tempUploadId, UUID documentVersionId) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Document permanent object rollback cleanup requires an active transaction");
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_ROLLED_BACK) {
                    return;
                }
                try {
                    storagePort.removePermanentObjectBestEffort(permanentObjectKey);
                } catch (RuntimeException cleanupFailure) {
                    log.warn(
                            "Document permanent object rollback cleanup failed. tempUploadId={}, documentVersionId={}",
                            tempUploadId,
                            documentVersionId
                    );
                }
            }
        });
    }
}
