package com.digiaudit.grcpc.modules.masterdata.ordering.api;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;

public record CatalogOrderRequest(@NotNull @Valid Key source, @NotNull @Valid Key destination,
        @NotNull Placement placement, @NotEmpty List<@NotNull @Valid Sibling> siblings) {
    public enum Placement { BEFORE, AFTER }
    public record Key(@NotNull RevisionEntityType entityType, @NotNull UUID id) {}
    public record Sibling(@NotNull RevisionEntityType entityType, @NotNull UUID id, @NotNull @PositiveOrZero Long version) {}
}
