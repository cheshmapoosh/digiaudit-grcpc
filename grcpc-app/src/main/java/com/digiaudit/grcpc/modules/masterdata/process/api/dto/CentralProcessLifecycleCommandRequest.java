package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import jakarta.validation.constraints.NotNull;

public record CentralProcessLifecycleCommandRequest(
        @NotNull
        Long version
) {
}
