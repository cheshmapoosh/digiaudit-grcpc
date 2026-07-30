package com.digiaudit.grcpc.common.exception;

public class UnprocessableEntityException extends BusinessException {
    public UnprocessableEntityException(String errorCode, String messageCode, String developerMessage, Object... messageArgs) {
        super(errorCode, messageCode, developerMessage, messageArgs);
    }
}
