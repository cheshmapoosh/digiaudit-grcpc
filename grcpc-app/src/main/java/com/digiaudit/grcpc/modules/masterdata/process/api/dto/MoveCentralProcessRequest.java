package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record MoveCentralProcessRequest(
        UUID parentProcessId,
        @NotNull
        Long version
) {
}
