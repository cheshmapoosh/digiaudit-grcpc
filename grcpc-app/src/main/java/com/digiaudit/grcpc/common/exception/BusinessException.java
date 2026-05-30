package com.digiaudit.grcpc.common.exception;

public abstract class BusinessException extends RuntimeException {
    private final String errorCode;
    private final String messageCode;
    private final Object[] messageArgs;
    private final String developerMessage;

    protected BusinessException(String message) {
        super(message);
        this.errorCode = getClass().getSimpleName();
        this.messageCode = null;
        this.messageArgs = new Object[0];
        this.developerMessage = message;
    }

    protected BusinessException(String errorCode, String messageCode, String developerMessage, Object... messageArgs) {
        super(developerMessage);
        this.errorCode = errorCode;
        this.messageCode = messageCode;
        this.messageArgs = messageArgs == null ? new Object[0] : messageArgs;
        this.developerMessage = developerMessage;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getMessageCode() {
        return messageCode;
    }

    public Object[] getMessageArgs() {
        return messageArgs;
    }

    public String getDeveloperMessage() {
        return developerMessage;
    }
}
