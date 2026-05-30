package com.digiaudit.grcpc.modules.masterdata.accountgroup.api.dto;

import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.value.*;
import java.util.List;
import java.util.UUID;

public record AccountGroupRequest(
        String code,
        String title,
        UUID parentId,
        String status,
        Integer sortOrder,
        String description,
        String importance,
        Boolean reasonableAssurance,
        String effectiveDate,
        Integer documentsCount,
        AccountGroupAssertionsValue assertions,
        List<AccountGroupObjectiveValue> objectives,
        List<AccountRangeValue> accountRanges,
        List<AccountGroupRiskValue> risks
) {
}
