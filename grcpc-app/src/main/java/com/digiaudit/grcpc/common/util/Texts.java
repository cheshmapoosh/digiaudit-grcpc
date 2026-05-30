package com.digiaudit.grcpc.common.util;

import org.springframework.util.StringUtils;

public final class Texts {

    private Texts() {
    }

    public static String normalizeRequired(String value) {
        String normalized = normalizeNullable(value);
        if (!StringUtils.hasText(normalized)) {
            throw new IllegalArgumentException("Value must not be blank");
        }
        return normalized;
    }

    public static String normalizeNullable(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    public static String toggleActiveInactive(String value) {
        return "active".equals(value) ? "inactive" : "active";
    }
}
