package com.digiaudit.grcpc.common.exception;

public class ConflictException extends BusinessException {
    public ConflictException(String message) {
        super(message);
    }

    public ConflictException(String errorCode, String messageCode, String developerMessage, Object... messageArgs) {
        super(errorCode, messageCode, developerMessage, messageArgs);
    }
}
