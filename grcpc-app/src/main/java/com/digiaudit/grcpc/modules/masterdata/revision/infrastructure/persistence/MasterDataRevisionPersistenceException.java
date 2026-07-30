package com.digiaudit.grcpc.modules.masterdata.revision.infrastructure.persistence;

public class MasterDataRevisionPersistenceException extends RuntimeException {
    public MasterDataRevisionPersistenceException(String message) {
        super(message);
    }

    public MasterDataRevisionPersistenceException(String message, Throwable cause) {
        super(message, cause);
    }
}
