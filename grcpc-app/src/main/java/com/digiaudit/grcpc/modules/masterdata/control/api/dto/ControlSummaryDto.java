package com.digiaudit.grcpc.modules.masterdata.control.api.dto;

import com.digiaudit.grcpc.modules.masterdata.control.domain.enums.ControlAutomationType;
import com.digiaudit.grcpc.modules.masterdata.control.domain.enums.ControlImportance;
import com.digiaudit.grcpc.modules.masterdata.control.domain.enums.ControlNature;
import com.digiaudit.grcpc.modules.masterdata.control.domain.enums.ControlStatus;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;

@Builder
public record ControlSummaryDto(
        UUID id,
        String code,
        String name,
        String description,
        String controlClass,
        ControlNature controlNature,
        ControlAutomationType automationType,
        ControlImportance importance,
        String objective,
        ControlStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
