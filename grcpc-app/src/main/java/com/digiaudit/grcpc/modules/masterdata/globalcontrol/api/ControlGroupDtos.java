package com.digiaudit.grcpc.modules.masterdata.globalcontrol.api;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class ControlGroupDtos {
  private ControlGroupDtos() {}

  public record Create(@NotBlank String code, @NotBlank String name, String description,
      UUID parentId, LocalDate validFrom, LocalDate validTo) {}

  public record Update(@NotBlank String name, String description, UUID parentId,
      LocalDate validFrom, LocalDate validTo, @NotNull Long version) {}

  public record Detail(UUID id, String nodeType, String code, String name, String description,
      UUID parentId, LocalDate validFrom, LocalDate validTo, MasterDataLifecycleStatus status,
      long version, Instant createdAt, Instant updatedAt) {}
}
