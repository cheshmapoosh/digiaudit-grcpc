package com.digiaudit.grcpc.modules.masterdata.revision.domain;

public enum RevisionOperationType {
    CREATE(false),
    UPDATE(true),
    ACTIVATE(true),
    INACTIVATE(true),
    DELETE(true),
    RESTORE(true);

    private final boolean expectedVersionRequired;

    RevisionOperationType(boolean expectedVersionRequired) {
        this.expectedVersionRequired = expectedVersionRequired;
    }

    public boolean requiresExpectedVersion() {
        return expectedVersionRequired;
    }
}
