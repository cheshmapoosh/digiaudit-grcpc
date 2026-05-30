package com.digiaudit.grcpc.modules.masterdata.risk.domain.value;

public record RiskEffectValue(
        String id,
        String effect,
        String effectCategory,
        String effectCategoryDescription
) {
}
