package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import com.digiaudit.grcpc.modules.masterdata.process.domain.enums.ControlAutomationType;
import com.digiaudit.grcpc.modules.masterdata.process.domain.enums.ControlImportance;
import com.digiaudit.grcpc.modules.masterdata.process.domain.enums.ControlNature;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

public record CreateControlAndAssignRequest(
        @NotBlank
        @Size(max = 50)
        String code,

        @NotBlank
        @Size(max = 255)
        String name,

        @Size(max = 2000)
        String description,

        @Size(max = 255)
        String controlClass,

        ControlNature controlNature,
        ControlAutomationType automationType,
        ControlImportance importance,

        @Size(max = 2000)
        String objective,

        UUID ownerId,

        @Size(max = 255)
        String ownerName,

        LocalDate validFrom,
        LocalDate validTo,

        @PositiveOrZero
        Integer sortOrder,

        @Size(max = 255)
        String operationPeriod,

        @Size(max = 255)
        String testMethod,

        @Size(max = 2000)
        String testPlan
) {
}
