package com.digiaudit.grcpc.common.exception;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public abstract class BusinessException extends RuntimeException {
    private final String errorCode;
    private final String messageCode;
    private final Object[] messageArgs;
    private final String developerMessage;
    private final Map<String, Object> errorContext = new LinkedHashMap<>();

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

    public void putErrorContext(String key, Object value) {
        if (key != null && !key.isBlank() && value != null) {
            errorContext.put(key, value);
        }
    }

    public Map<String, Object> getErrorContext() {
        return Collections.unmodifiableMap(errorContext);
    }
}
