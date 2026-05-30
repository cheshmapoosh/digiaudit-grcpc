package com.digiaudit.grcpc.modules.masterdata.risk.domain.converter;

import static org.assertj.core.api.Assertions.assertThat;

import com.digiaudit.grcpc.modules.masterdata.risk.domain.value.RiskEffectValue;
import java.util.List;
import org.junit.jupiter.api.Test;

class RiskEffectListConverterTest {

    private final RiskEffectListConverter converter = new RiskEffectListConverter();

    @Test
    void convertsRiskEffectsToJsonAndBack() {
        List<RiskEffectValue> effects = List.of(
                new RiskEffectValue("effect-1", "Service outage", "operational", "Stops operations"));

        String json = converter.convertToDatabaseColumn(effects);

        assertThat(converter.convertToEntityAttribute(json)).isEqualTo(effects);
    }

    @Test
    void ignoresLegacyMalformedClobValues() {
        assertThat(converter.convertToEntityAttribute("[B@7c3df479")).isEmpty();
    }
}
