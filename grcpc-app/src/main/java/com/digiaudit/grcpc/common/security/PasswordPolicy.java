package com.digiaudit.grcpc.common.security;

import com.digiaudit.grcpc.common.exception.ConflictException;
import java.nio.charset.StandardCharsets;

public final class PasswordPolicy {
    private PasswordPolicy() {}

    public static void validate(String password) {
        if (password == null || password.isBlank() || password.length() < 8
                || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ConflictException("INVALID_PASSWORD", "security.password.invalid", "Password must be at least 8 characters and at most 72 UTF-8 bytes");
        }
    }
}
