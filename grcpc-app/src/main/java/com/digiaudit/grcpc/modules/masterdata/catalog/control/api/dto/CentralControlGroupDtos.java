package com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class CentralControlGroupDtos {
  private CentralControlGroupDtos() {}

  public record Create(
      @NotBlank String code,
      @NotBlank String title,
      UUID parentGroupId,
      String description,
      Integer sortOrder,
      LocalDate validFrom,
      LocalDate validTo) {}

  public record Update(
      @NotBlank String title,
      UUID parentGroupId,
      String description,
      Integer sortOrder,
      @NotNull MasterDataLifecycleStatus status,
      LocalDate validFrom,
      LocalDate validTo,
      @NotNull Long version) {}

  public record Summary(
      UUID id,
      String code,
      String title,
      UUID parentGroupId,
      int sortOrder,
      MasterDataLifecycleStatus status,
      LocalDate validFrom,
      LocalDate validTo,
      long version) {}

  public record Detail(
      UUID id,
      String code,
      String title,
      UUID parentGroupId,
      String description,
      int sortOrder,
      MasterDataLifecycleStatus status,
      LocalDate validFrom,
      LocalDate validTo,
      long version,
      Instant createdAt,
      UUID createdBy,
      Instant updatedAt,
      UUID updatedBy,
      Instant deletedAt,
      UUID deletedBy) {}
}
