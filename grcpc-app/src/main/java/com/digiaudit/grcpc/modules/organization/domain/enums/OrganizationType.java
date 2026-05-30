package com.digiaudit.grcpc.modules.organization.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum OrganizationType {
    HOLDING("holding"),
    COMPANY("company"),
    DEPUTY("deputy"),
    OFFICE("office"),
    MANAGEMENT("management"),
    DEPARTMENT("department"),
    BRANCH("branch"),
    UNIT("unit"),
    COMMITTEE("committee"),
    GROUP("group"),
    OTHER("other");

    private final String jsonValue;

    OrganizationType(String jsonValue) {
        this.jsonValue = jsonValue;
    }

    @JsonValue
    public String getJsonValue() {
        return jsonValue;
    }

    @JsonCreator
    public static OrganizationType fromJson(String value) {
        for (OrganizationType item : values()) {
            if (item.name().equalsIgnoreCase(value) || item.jsonValue.equalsIgnoreCase(value)) {
                return item;
            }
        }
        throw new IllegalArgumentException("Invalid organization type: " + value);
    }
}
