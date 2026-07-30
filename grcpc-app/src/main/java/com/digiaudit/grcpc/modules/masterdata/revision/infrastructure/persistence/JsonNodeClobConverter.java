package com.digiaudit.grcpc.modules.masterdata.revision.infrastructure.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class JsonNodeClobConverter implements AttributeConverter<JsonNode, String> {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(JsonNode attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(attribute.deepCopy());
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
            return OBJECT_MAPPER.readTree(dbData).deepCopy();
        } catch (JsonProcessingException ex) {
            throw new MasterDataRevisionPersistenceException("Stored Revision JSON snapshot is invalid", ex);
        }
    }
}
