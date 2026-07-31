package com.digiaudit.grcpc.modules.document.domain;

import java.util.Arrays;
import java.util.Locale;

public enum DocumentLifecycleStatus {
    ACTIVE("ACTIVE"),
    INACTIVE("INACTIVE"),
    DELETED("DELETED");

    private final String wireValue;

    DocumentLifecycleStatus(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }

    public static DocumentLifecycleStatus fromWireValue(String wireValue) {
        String normalized = wireValue == null ? "" : wireValue.trim().toUpperCase(Locale.ROOT);
        return Arrays.stream(values())
                .filter(status -> status.wireValue.equals(normalized))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown document lifecycle status"));
    }
}
