package com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.UUID;

public record InitialControlSubprocessRequest(
    @NotNull UUID subprocessId,
    @NotNull @PositiveOrZero Long version) {}
