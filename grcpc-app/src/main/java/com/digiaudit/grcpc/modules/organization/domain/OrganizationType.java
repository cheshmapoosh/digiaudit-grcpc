package com.digiaudit.grcpc.modules.organization.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Arrays;
import java.util.Locale;

public enum OrganizationType {
    HOLDING("HOLDING"),
    COMPANY("COMPANY"),
    DEPUTY("DEPUTY"),
    OFFICE("OFFICE"),
    MANAGEMENT("MANAGEMENT"),
    DEPARTMENT("DEPARTMENT"),
    BRANCH("BRANCH"),
    UNIT("UNIT"),
    COMMITTEE("COMMITTEE"),
    GROUP("GROUP"),
    OTHER("OTHER");

    private final String wireValue;

    OrganizationType(String wireValue) {
        this.wireValue = wireValue;
    }

    @JsonValue
    public String wireValue() {
        return wireValue;
    }

    @JsonCreator
    public static OrganizationType fromWireValue(String wireValue) {
        String normalized = wireValue == null ? "" : wireValue.trim().toUpperCase(Locale.ROOT);
        return Arrays.stream(values())
                .filter(type -> type.wireValue.equals(normalized))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown organization type"));
    }
}
