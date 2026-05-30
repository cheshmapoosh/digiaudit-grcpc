package com.digiaudit.grcpc.modules.masterdata.risk.api.dto;

import com.digiaudit.grcpc.modules.masterdata.risk.domain.value.RiskEffectValue;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder
public record RiskNodeResponse(
        UUID id,
        String code,
        String title,
        String nodeType,
        UUID parentId,
        String status,
        Integer sortOrder,
        String description,
        LocalDate validFrom,
        LocalDate validTo,
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
        Integer controlCentersCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        UUID createdBy,
        UUID updatedBy
) {
}
