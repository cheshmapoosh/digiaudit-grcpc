package com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.converter;

import static org.assertj.core.api.Assertions.assertThat;

import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.value.AccountGroupObjectiveValue;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.value.AccountGroupRiskValue;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.value.AccountRangeValue;
import java.util.List;
import org.junit.jupiter.api.Test;

class AccountGroupJsonListConvertersTest {

    @Test
    void convertsObjectivesToJsonAndBack() {
        AccountGroupObjectiveListConverter converter = new AccountGroupObjectiveListConverter();
        List<AccountGroupObjectiveValue> objectives = List.of(
                new AccountGroupObjectiveValue("obj-1", "Completeness", "Check account completeness"));

        String json = converter.convertToDatabaseColumn(objectives);

        assertThat(converter.convertToEntityAttribute(json)).isEqualTo(objectives);
    }

    @Test
    void convertsAccountRangesToJsonAndBack() {
        AccountRangeListConverter converter = new AccountRangeListConverter();
        List<AccountRangeValue> ranges = List.of(
                new AccountRangeValue("range-1", "1000", "1999", "Assets"));

        String json = converter.convertToDatabaseColumn(ranges);

        assertThat(converter.convertToEntityAttribute(json)).isEqualTo(ranges);
    }

    @Test
    void convertsRisksToJsonAndBack() {
        AccountGroupRiskListConverter converter = new AccountGroupRiskListConverter();
        List<AccountGroupRiskValue> risks = List.of(
                new AccountGroupRiskValue("risk-1", "Misstatement", "Financial reporting risk", "manual"));

        String json = converter.convertToDatabaseColumn(risks);

        assertThat(converter.convertToEntityAttribute(json)).isEqualTo(risks);
    }

    @Test
    void ignoresLegacyMalformedClobValues() {
        assertThat(new AccountGroupObjectiveListConverter().convertToEntityAttribute("[B@7c3df479")).isEmpty();
        assertThat(new AccountRangeListConverter().convertToEntityAttribute("[B@7c3df479")).isEmpty();
        assertThat(new AccountGroupRiskListConverter().convertToEntityAttribute("[B@7c3df479")).isEmpty();
    }
}
