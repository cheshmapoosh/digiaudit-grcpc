package com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.UUID;

public record AccountGroupControlSelection(@NotNull UUID controlId, @NotNull @PositiveOrZero Long version) {}
