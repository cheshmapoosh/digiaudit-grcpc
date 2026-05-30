package com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.converter;

import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.value.AccountRangeValue;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.List;

@Converter
public class AccountRangeListConverter implements AttributeConverter<List<AccountRangeValue>, String> {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<List<AccountRangeValue>> TYPE_REFERENCE = new TypeReference<>() {};

    @Override
    public String convertToDatabaseColumn(List<AccountRangeValue> attribute) {
        try {
            return OBJECT_MAPPER.writeValueAsString(attribute == null ? List.of() : attribute);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Unable to serialize account ranges", ex);
        }
    }

    @Override
    public List<AccountRangeValue> convertToEntityAttribute(String dbData) {
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
