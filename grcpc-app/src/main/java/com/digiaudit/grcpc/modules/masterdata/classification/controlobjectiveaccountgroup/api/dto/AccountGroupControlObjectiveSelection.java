package com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.UUID;

public record AccountGroupControlObjectiveSelection(
    @NotNull UUID controlObjectiveId, @NotNull @PositiveOrZero Long version) {}
