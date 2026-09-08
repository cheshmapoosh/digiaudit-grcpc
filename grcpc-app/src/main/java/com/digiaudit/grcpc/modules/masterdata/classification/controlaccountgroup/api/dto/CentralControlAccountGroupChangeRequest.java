package com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record CentralControlAccountGroupChangeRequest(
    @NotNull CentralControlAccountGroupChangeOperation operation,
    @NotNull UUID accountGroupId,
    UUID classificationId,
    Long version,
    LocalDate validFrom,
    LocalDate validTo,
    MasterDataLifecycleStatus requestedStatus) {}
