package com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.converter;

import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlRelevance;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;
import java.util.stream.Collectors;

@Converter
public class CentralControlRelevanceConverter
    implements AttributeConverter<Set<CentralControlRelevance>, String> {

  @Override
  public String convertToDatabaseColumn(Set<CentralControlRelevance> attribute) {
    if (attribute == null || attribute.isEmpty()) return null;
    return attribute.stream()
        .sorted()
        .map(Enum::name)
        .collect(Collectors.joining(","));
  }

  @Override
  public Set<CentralControlRelevance> convertToEntityAttribute(String dbData) {
    if (dbData == null || dbData.isBlank()) return EnumSet.noneOf(CentralControlRelevance.class);
    EnumSet<CentralControlRelevance> result = EnumSet.noneOf(CentralControlRelevance.class);
    Arrays.stream(dbData.split(","))
        .map(String::trim)
        .filter(value -> !value.isEmpty())
        .map(CentralControlRelevance::valueOf)
        .forEach(result::add);
    return result;
  }
}
