package com.digiaudit.grcpc.modules.regulation.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum RegulationNodeType {
    GROUP("lawGroup"),
    LAW("law"),
    REQUIREMENT("lawRequirement");

    private final String jsonValue;

    RegulationNodeType(String jsonValue) {
        this.jsonValue = jsonValue;
    }

    @JsonValue
    public String getJsonValue() {
        return jsonValue;
    }

    @JsonCreator
    public static RegulationNodeType fromJson(String value) {
        for (RegulationNodeType item : values()) {
            if (item.name().equalsIgnoreCase(value) || item.jsonValue.equalsIgnoreCase(value)) {
                return item;
            }
        }
        throw new IllegalArgumentException("Invalid regulation node type: " + value);
    }
}
