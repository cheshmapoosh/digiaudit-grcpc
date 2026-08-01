package com.digiaudit.grcpc.modules.document.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.ForbiddenException;
import com.digiaudit.grcpc.common.exception.GoneException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;

public final class DocumentFailures {
    private static final String MESSAGE_CODE = "error.internal";

    private DocumentFailures() {
    }

    public static NotFoundException notFound(String code, String message) {
        return new NotFoundException(code, MESSAGE_CODE, message);
    }

    public static ConflictException conflict(String code, String message) {
        return new ConflictException(code, MESSAGE_CODE, message);
    }

    public static ForbiddenException forbidden(String code, String message) {
        return new ForbiddenException(code, MESSAGE_CODE, message);
    }

    public static GoneException gone(String code, String message) {
        return new GoneException(code, MESSAGE_CODE, message);
    }

    public static UnprocessableEntityException invalid(String code, String message) {
        return new UnprocessableEntityException(code, MESSAGE_CODE, message);
    }
}
