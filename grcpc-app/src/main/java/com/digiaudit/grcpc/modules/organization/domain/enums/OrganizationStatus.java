package com.digiaudit.grcpc.modules.organization.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum OrganizationStatus {
    ACTIVE("active"),
    INACTIVE("inactive");

    private final String jsonValue;

    OrganizationStatus(String jsonValue) {
        this.jsonValue = jsonValue;
    }

    @JsonValue
    public String getJsonValue() {
        return jsonValue;
    }

    @JsonCreator
    public static OrganizationStatus fromJson(String value) {
        for (OrganizationStatus item : values()) {
            if (item.name().equalsIgnoreCase(value) || item.jsonValue.equalsIgnoreCase(value)) {
                return item;
            }
        }
        throw new IllegalArgumentException("Invalid organization status: " + value);
    }
}
