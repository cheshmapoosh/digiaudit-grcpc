package com.digiaudit.grcpc.modules.masterdata.shared.infrastructure.persistence;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataHierarchyGuard;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataErrorCode;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.exception.HierarchyGuardNotConfiguredException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.LockTimeoutException;
import jakarta.persistence.PessimisticLockException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Objects;

@Component
public class JpaMasterDataHierarchyGuard implements MasterDataHierarchyGuard {
    private static final String LOCK_TIMEOUT_HINT = "jakarta.persistence.lock.timeout";

    private final EntityManager entityManager;
    private final int lockTimeoutMs;

    public JpaMasterDataHierarchyGuard(
            EntityManager entityManager,
            @Value("${app.master-data.hierarchy-lock-timeout-ms}") int lockTimeoutMs
    ) {
        this.entityManager = Objects.requireNonNull(entityManager, "entityManager is required");
        if (lockTimeoutMs < 0) {
            throw new IllegalArgumentException("hierarchy lock timeout must not be negative");
        }
        this.lockTimeoutMs = lockTimeoutMs;
    }

    @Override
    public void lock(MasterDataHierarchyKey hierarchyKey) {
        Objects.requireNonNull(hierarchyKey, "hierarchyKey is required");
        try {
            MasterDataHierarchyGuardEntity guard = entityManager.find(
                    MasterDataHierarchyGuardEntity.class,
                    hierarchyKey.name(),
                    LockModeType.PESSIMISTIC_WRITE,
                    Map.of(LOCK_TIMEOUT_HINT, lockTimeoutMs)
            );
            if (guard == null) {
                throw new HierarchyGuardNotConfiguredException();
            }
        } catch (RuntimeException exception) {
            if (isRecognizedLockFailure(exception)) {
                throw hierarchyBusy();
            }
            throw exception;
        }
    }

    private boolean isRecognizedLockFailure(Throwable failure) {
        Throwable current = failure;
        while (current != null) {
            if (current instanceof LockTimeoutException
                    || current instanceof PessimisticLockException
                    || current instanceof jakarta.persistence.QueryTimeoutException
                    || current instanceof PessimisticLockingFailureException
                    || current instanceof org.springframework.dao.QueryTimeoutException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private ConflictException hierarchyBusy() {
        return new ConflictException(
                MasterDataErrorCode.HIERARCHY_BUSY.code(),
                "error.masterdata.v2.hierarchyBusy",
                "The requested hierarchy is busy"
        );
    }
}
