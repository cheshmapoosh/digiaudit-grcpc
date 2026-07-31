package com.digiaudit.grcpc.modules.document.domain;

import java.util.Arrays;
import java.util.Locale;

public enum DocumentTempUploadStatus {
    UPLOADING("UPLOADING"),
    AVAILABLE("AVAILABLE"),
    CONSUMED("CONSUMED"),
    EXPIRED("EXPIRED"),
    FAILED("FAILED");

    private final String wireValue;

    DocumentTempUploadStatus(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }

    public static DocumentTempUploadStatus fromWireValue(String wireValue) {
        String normalized = wireValue == null ? "" : wireValue.trim().toUpperCase(Locale.ROOT);
        return Arrays.stream(values())
                .filter(status -> status.wireValue.equals(normalized))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown document temporary-upload status"));
    }
}
