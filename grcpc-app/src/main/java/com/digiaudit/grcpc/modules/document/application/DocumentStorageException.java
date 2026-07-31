package com.digiaudit.grcpc.modules.document.application;

public class DocumentStorageException extends RuntimeException {
    private final String errorCode;

    public DocumentStorageException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public DocumentStorageException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String errorCode() {
        return errorCode;
    }
}
