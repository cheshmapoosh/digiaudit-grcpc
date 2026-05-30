package com.digiaudit.grcpc.modules.regulation.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum RegulationStatus {
    ACTIVE("active"),
    INACTIVE("inactive");

    private final String jsonValue;

    RegulationStatus(String jsonValue) {
        this.jsonValue = jsonValue;
    }

    @JsonValue
    public String getJsonValue() {
        return jsonValue;
    }

    @JsonCreator
    public static RegulationStatus fromJson(String value) {
        for (RegulationStatus item : values()) {
            if (item.name().equalsIgnoreCase(value) || item.jsonValue.equalsIgnoreCase(value)) {
                return item;
            }
        }
        throw new IllegalArgumentException("Invalid regulation status: " + value);
    }
}
