package com.digiaudit.grcpc.common.util;

import java.time.LocalDate;
import org.springframework.util.StringUtils;

public final class Dates {

    private Dates() {
    }

    public static LocalDate parseNullable(String value) {
        return StringUtils.hasText(value) ? LocalDate.parse(value.trim()) : null;
    }

    public static void requireValidRange(LocalDate from, LocalDate to, String message) {
        if (from != null && to != null && to.isBefore(from)) {
            throw new IllegalArgumentException(message);
        }
    }
}
