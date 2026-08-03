package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import jakarta.validation.constraints.NotNull;

public record CentralSubprocessLifecycleCommandRequest(
        @NotNull
        Long version
) {
}
