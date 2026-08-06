package com.digiaudit.grcpc.modules.masterdata.catalog.shared.api.dto;

import jakarta.validation.constraints.NotNull;

public record CatalogLifecycleCommandRequest(@NotNull Long version) {
}
