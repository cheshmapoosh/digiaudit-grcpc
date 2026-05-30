package com.digiaudit.grcpc.common.persistence;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.math.BigDecimal;

@Converter(autoApply = true)
public class BooleanNumberConverter implements AttributeConverter<Boolean, BigDecimal> {

    private static final BigDecimal TRUE_VALUE = BigDecimal.ONE;
    private static final BigDecimal FALSE_VALUE = BigDecimal.ZERO;

    @Override
    public BigDecimal convertToDatabaseColumn(Boolean attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute ? TRUE_VALUE : FALSE_VALUE;
    }

    @Override
    public Boolean convertToEntityAttribute(BigDecimal dbData) {
        if (dbData == null) {
            return null;
        }
        return TRUE_VALUE.compareTo(dbData) == 0;
    }
}
