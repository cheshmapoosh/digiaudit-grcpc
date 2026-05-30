package com.digiaudit.grcpc.modules.masterdata.accountgroup.api.dto;

import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.value.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

@Builder
public record AccountGroupResponse(
        UUID id,
        String code,
        String title,
        UUID parentId,
        String status,
        Integer sortOrder,
        String description,
        String importance,
        Boolean reasonableAssurance,
        LocalDate effectiveDate,
        Integer documentsCount,
        AccountGroupAssertionsValue assertions,
        List<AccountGroupObjectiveValue> objectives,
        List<AccountRangeValue> accountRanges,
        List<AccountGroupRiskValue> risks,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        UUID createdBy,
        UUID updatedBy
) {
}
