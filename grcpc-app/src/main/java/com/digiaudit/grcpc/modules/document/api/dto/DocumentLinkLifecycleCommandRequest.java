package com.digiaudit.grcpc.modules.document.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record DocumentLinkLifecycleCommandRequest(
        @NotNull @PositiveOrZero Long expectedVersion
) {
}
