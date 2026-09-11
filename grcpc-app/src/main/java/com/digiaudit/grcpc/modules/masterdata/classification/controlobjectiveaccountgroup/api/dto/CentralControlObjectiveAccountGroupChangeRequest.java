package com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record CentralControlObjectiveAccountGroupChangeRequest(
    @NotNull CentralControlObjectiveAccountGroupChangeOperation operation,
    @NotNull UUID accountGroupId,
    UUID classificationId,
    Long version,
    LocalDate validFrom,
    LocalDate validTo,
    MasterDataLifecycleStatus requestedStatus) {}
