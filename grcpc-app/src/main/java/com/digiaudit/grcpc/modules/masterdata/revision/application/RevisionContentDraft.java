package com.digiaudit.grcpc.modules.masterdata.revision.application;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.VersionedCommand;

import java.util.Objects;
import java.util.UUID;

public record RevisionContentDraft(
        RevisionEntityType entityType,
        UUID entityId,
        RevisionOperationType operationType,
        Long expectedVersion
) {
    public RevisionContentDraft {
        Objects.requireNonNull(entityType, "entityType is required");
        Objects.requireNonNull(entityId, "entityId is required");
        Objects.requireNonNull(operationType, "operationType is required");
        validateExpectedVersion(operationType, expectedVersion);
    }

    public static RevisionContentDraft create(RevisionEntityType entityType, UUID entityId) {
        return new RevisionContentDraft(entityType, entityId, RevisionOperationType.CREATE, null);
    }

    public static RevisionContentDraft versioned(
            RevisionEntityType entityType,
            UUID entityId,
            RevisionOperationType operationType,
            VersionedCommand command
    ) {
        Objects.requireNonNull(command, "command is required");
        return new RevisionContentDraft(entityType, entityId, operationType, command.expectedVersion());
    }

    private static void validateExpectedVersion(RevisionOperationType operationType, Long expectedVersion) {
        if (operationType.requiresExpectedVersion() && expectedVersion == null) {
            throw new IllegalArgumentException("expectedVersion is required for " + operationType);
        }
        if (!operationType.requiresExpectedVersion() && expectedVersion != null) {
            throw new IllegalArgumentException("expectedVersion is not valid for " + operationType);
        }
        if (expectedVersion != null && expectedVersion < 0) {
            throw new IllegalArgumentException("expectedVersion must not be negative");
        }
    }
}
