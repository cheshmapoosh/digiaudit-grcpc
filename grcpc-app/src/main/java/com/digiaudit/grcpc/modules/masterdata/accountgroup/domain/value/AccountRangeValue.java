package com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.value;

public record AccountRangeValue(
        String id,
        String fromAccount,
        String toAccount,
        String description
) {
}
