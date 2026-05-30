package com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.converter;

import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.value.AccountGroupRiskValue;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.List;

@Converter
public class AccountGroupRiskListConverter implements AttributeConverter<List<AccountGroupRiskValue>, String> {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<List<AccountGroupRiskValue>> TYPE_REFERENCE = new TypeReference<>() {};

    @Override
    public String convertToDatabaseColumn(List<AccountGroupRiskValue> attribute) {
        try {
            return OBJECT_MAPPER.writeValueAsString(attribute == null ? List.of() : attribute);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Unable to serialize account group risks", ex);
        }
    }

    @Override
    public List<AccountGroupRiskValue> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return List.of();
        }

        try {
            return OBJECT_MAPPER.readValue(dbData, TYPE_REFERENCE);
        } catch (JsonProcessingException ex) {
            return List.of();
        }
    }
}
