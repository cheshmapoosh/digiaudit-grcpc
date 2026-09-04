package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.CentralControlScopeChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.api.dto.CentralRiskScopeChangeRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateCentralSubprocessRequest(
        @NotBlank
        String code,
        @NotBlank
        String title,
        @NotNull
        UUID processId,
        String description,
        Integer sortOrder,
        LocalDate validFrom,
        LocalDate validTo,
        @Valid DocumentAggregateBatchRequest documents,
        List<@NotNull @Valid CentralControlScopeChangeRequest> controlScopeChanges,
        List<@NotNull @Valid CentralRiskScopeChangeRequest> riskScopeChanges
) {
    public CreateCentralSubprocessRequest {
        controlScopeChanges = controlScopeChanges == null ? List.of() : List.copyOf(controlScopeChanges);
        riskScopeChanges = riskScopeChanges == null ? List.of() : List.copyOf(riskScopeChanges);
    }
}
