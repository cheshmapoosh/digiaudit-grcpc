package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.common.security.CurrentUser;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.document.domain.DocumentTempUploadStatus;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentTempUploadEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.InternalDocumentTempUploadJpaRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Service
public class DocumentTempUploadStateService {
    private final InternalDocumentTempUploadJpaRepository repository;
    private final CurrentUserProvider currentUserProvider;
    private final Clock clock;

    public DocumentTempUploadStateService(
            InternalDocumentTempUploadJpaRepository repository,
            CurrentUserProvider currentUserProvider,
            @Qualifier("masterDataRevisionClock") Clock clock
    ) {
        this.repository = Objects.requireNonNull(repository, "repository is required");
        this.currentUserProvider = Objects.requireNonNull(currentUserProvider, "currentUserProvider is required");
        this.clock = Objects.requireNonNull(clock, "clock is required");
    }

    @Transactional
    public DocumentTempUploadEntity createUploading(DocumentTempUploadEntity entity) {
        return repository.saveAndFlush(entity);
    }

    @Transactional
    public DocumentTempUploadEntity markAvailable(UUID id) {
        DocumentTempUploadEntity entity = repository.lockById(id)
                .orElseThrow(() -> DocumentFailures.notFound("TEMPORARY_UPLOAD_NOT_FOUND", "Temporary upload was not found"));
        entity.markAvailable();
        return repository.saveAndFlush(entity);
    }

    @Transactional
    public void markFailed(UUID id) {
        repository.lockById(id).ifPresent(entity -> {
            entity.markFailed();
            repository.saveAndFlush(entity);
        });
    }

    @Transactional
    public DocumentTempUploadEntity inspectOwnerScoped(UUID id) {
        DocumentTempUploadEntity entity = repository.findById(id)
                .orElseThrow(() -> DocumentFailures.notFound("TEMPORARY_UPLOAD_NOT_FOUND", "Temporary upload was not found"));
        CurrentUser currentUser = currentUserProvider.getCurrentPrincipal();
        if (!currentUser.isRootUser() && !entity.getUploadedBy().equals(currentUser.getUserId())) {
            throw DocumentFailures.forbidden("TEMPORARY_UPLOAD_OWNERSHIP_DENIED", "Temporary upload is owned by another user");
        }
        expireIfNeeded(entity, Instant.now(clock));
        return repository.saveAndFlush(entity);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public DocumentTempUploadEntity lockForConsumption(UUID id, UUID actorId, Instant now, boolean internalFlow) {
        DocumentTempUploadEntity entity = repository.lockById(id)
                .orElseThrow(() -> DocumentFailures.notFound("TEMPORARY_UPLOAD_NOT_FOUND", "Temporary upload was not found"));
        expireIfNeeded(entity, now);
        validateConsumable(entity, actorId, internalFlow);
        return entity;
    }

    private void expireIfNeeded(DocumentTempUploadEntity entity, Instant now) {
        if ((entity.getUploadStatus() == DocumentTempUploadStatus.AVAILABLE
                || entity.getUploadStatus() == DocumentTempUploadStatus.UPLOADING)
                && !now.isBefore(entity.getExpiresAt())) {
            entity.markExpired();
        }
    }

    private void validateConsumable(DocumentTempUploadEntity entity, UUID actorId, boolean internalFlow) {
        if (entity.getUploadStatus() == DocumentTempUploadStatus.EXPIRED) {
            throw DocumentFailures.conflict("TEMPORARY_UPLOAD_EXPIRED", "Temporary upload has expired");
        }
        if (entity.getUploadStatus() == DocumentTempUploadStatus.CONSUMED) {
            throw DocumentFailures.conflict("TEMPORARY_UPLOAD_ALREADY_CONSUMED", "Temporary upload was already consumed");
        }
        if (entity.getUploadStatus() != DocumentTempUploadStatus.AVAILABLE) {
            throw DocumentFailures.conflict("TEMPORARY_UPLOAD_UNAVAILABLE", "Temporary upload is not available for consumption");
        }
        if (!internalFlow && !entity.getUploadedBy().equals(actorId)) {
            throw DocumentFailures.forbidden("TEMPORARY_UPLOAD_OWNERSHIP_DENIED", "Temporary upload is owned by another user");
        }
        if (entity.getConsumedAt() != null || entity.getDocumentVersionId() != null) {
            throw DocumentFailures.conflict("TEMPORARY_UPLOAD_ALREADY_CONSUMED", "Temporary upload was already consumed");
        }
    }
}
