package com.digiaudit.grcpc.modules.document.infrastructure.persistence;

import com.digiaudit.grcpc.modules.document.domain.DocumentLifecycleStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class DocumentLifecycleStatusConverter implements AttributeConverter<DocumentLifecycleStatus, String> {
    @Override
    public String convertToDatabaseColumn(DocumentLifecycleStatus attribute) {
        return attribute == null ? null : attribute.wireValue();
    }

    @Override
    public DocumentLifecycleStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : DocumentLifecycleStatus.fromWireValue(dbData);
    }
}
