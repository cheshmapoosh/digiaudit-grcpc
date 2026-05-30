package com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.value;

public record AccountGroupAssertionsValue(
        Boolean existence,
        Boolean completeness,
        Boolean valuation,
        Boolean disclosure
) {
}
