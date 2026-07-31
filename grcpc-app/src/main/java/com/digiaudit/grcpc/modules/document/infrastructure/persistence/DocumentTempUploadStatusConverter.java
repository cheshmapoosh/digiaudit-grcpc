package com.digiaudit.grcpc.modules.document.infrastructure.persistence;

import com.digiaudit.grcpc.modules.document.domain.DocumentTempUploadStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class DocumentTempUploadStatusConverter implements AttributeConverter<DocumentTempUploadStatus, String> {
    @Override
    public String convertToDatabaseColumn(DocumentTempUploadStatus attribute) {
        return attribute == null ? null : attribute.wireValue();
    }

    @Override
    public DocumentTempUploadStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : DocumentTempUploadStatus.fromWireValue(dbData);
    }
}
