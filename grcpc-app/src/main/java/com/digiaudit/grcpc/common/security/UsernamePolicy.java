package com.digiaudit.grcpc.common.security;

import com.digiaudit.grcpc.common.exception.ConflictException;
import java.util.Locale;

public final class UsernamePolicy {
    private UsernamePolicy() {}

    public static String normalize(String username) {
        if (username == null || !username.matches("[A-Za-z0-9]{1,100}")) {
            throw new ConflictException("INVALID_USERNAME", "security.username.invalid",
                    "Username must contain only ASCII letters and digits");
        }
        return username.toLowerCase(Locale.ROOT);
    }
}
