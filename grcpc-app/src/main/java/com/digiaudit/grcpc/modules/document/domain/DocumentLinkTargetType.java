package com.digiaudit.grcpc.modules.document.domain;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Locale;

public enum DocumentLinkTargetType {
    ORGANIZATION("ORG", true),
    CENTRAL_PROCESS("CENTRAL_PROCESS", true),
    CENTRAL_SUBPROCESS("CENTRAL_SUBPROCESS", true),
    CENTRAL_CONTROL("CENTRAL_CONTROL", true),
    CENTRAL_CONTROL_OBJECTIVE("CENTRAL_CONTROL_OBJECTIVE_DEF", true),
    CENTRAL_RISK_CATEGORY("CENTRAL_RISK_CATEGORY", true),
    CENTRAL_RISK_TEMPLATE("CENTRAL_RISK_TEMPLATE", true),
    CENTRAL_ACCOUNT_GROUP("CENTRAL_ACCOUNT_GROUP", true),
    CENTRAL_REGULATION_GROUP("CENTRAL_REGULATION_GROUP", true),
    CENTRAL_REGULATION("CENTRAL_REGULATION", true),
    CENTRAL_REGULATION_REQUIREMENT("CENTRAL_REQUIREMENT", true),
    CENTRAL_POLICY_GROUP("CENTRAL_POLICY_GROUP", true),
    CENTRAL_POLICY("CENTRAL_POLICY", true),
    CENTRAL_POLICY_VERSION("CENTRAL_POLICY_VERSION", true),
    MASTERDATA_REVISION("MASTERDATA_REVISION", false);

    private final String wireValue;
    private final boolean publicSelectable;

    DocumentLinkTargetType(String wireValue, boolean publicSelectable) {
        if (wireValue.getBytes(StandardCharsets.US_ASCII).length > 32) {
            throw new IllegalArgumentException("document link target wireValue exceeds 32 bytes");
        }
        this.wireValue = wireValue;
        this.publicSelectable = publicSelectable;
    }

    public String wireValue() {
        return wireValue;
    }

    public boolean isPublicSelectable() {
        return publicSelectable;
    }

    public static DocumentLinkTargetType fromWireValue(String wireValue) {
        String normalized = normalize(wireValue);
        return Arrays.stream(values())
                .filter(type -> type.wireValue.equals(normalized))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown document link target type"));
    }

    public static DocumentLinkTargetType fromPublicWireValue(String wireValue) {
        DocumentLinkTargetType type = fromWireValue(wireValue);
        if (!type.publicSelectable) {
            throw new IllegalArgumentException("Document link target type is not browser selectable");
        }
        return type;
    }

    private static String normalize(String wireValue) {
        if (wireValue == null || wireValue.isBlank()) {
            throw new IllegalArgumentException("Document link target type is required");
        }
        return wireValue.trim().toUpperCase(Locale.ROOT);
    }
}
