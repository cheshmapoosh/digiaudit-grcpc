package com.digiaudit.grcpc.modules.masterdata.revision.infrastructure.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.stereotype.Component;

import java.util.Objects;

@Component
@Converter
public class JsonNodeClobConverter implements AttributeConverter<JsonNode, String> {
    private final ObjectMapper objectMapper;

    public JsonNodeClobConverter(ObjectMapper objectMapper) {
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper is required");
    }

    @Override
    public String convertToDatabaseColumn(JsonNode attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(attribute.deepCopy());
        } catch (JsonProcessingException ex) {
            throw new MasterDataRevisionPersistenceException("Revision JSON snapshot could not be serialized", ex);
        }
    }

    @Override
    public JsonNode convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        try {
            return objectMapper.readTree(dbData).deepCopy();
        } catch (JsonProcessingException ex) {
            throw new MasterDataRevisionPersistenceException("Stored Revision JSON snapshot is invalid", ex);
        }
    }
}
