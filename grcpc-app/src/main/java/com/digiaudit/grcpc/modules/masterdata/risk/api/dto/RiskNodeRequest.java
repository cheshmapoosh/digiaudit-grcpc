package com.digiaudit.grcpc.modules.masterdata.risk.api.dto;

import com.digiaudit.grcpc.modules.masterdata.risk.domain.value.RiskEffectValue;
import java.util.List;
import java.util.UUID;

public record RiskNodeRequest(
        String code,
        String title,
        String nodeType,
        UUID parentId,
        String status,
        Integer sortOrder,
        String description,
        String validFrom,
        String validTo,
        Boolean allowReference,
        String analysisProfile,
        UUID ownerId,
        String ownerName,
        Integer documentsCount,
        String companyOperation,
        String riskType,
        String causes,
        List<RiskEffectValue> effects,
        Integer existingRisksCount,
        Integer responsePatternsCount,
        Integer controlCentersCount
) {
}
