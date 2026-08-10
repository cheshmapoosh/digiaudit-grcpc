package com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.enums.CentralAccountGroupImportance;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class CentralAccountGroupDtos {
  private CentralAccountGroupDtos() {}

  public record Create(
      @NotBlank String code,
      @NotBlank String title,
      UUID parentAccountGroupId,
      @NotNull CentralAccountGroupImportance importance,
      @NotNull Boolean reasonableAssurance,
      String description,
      Integer sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      @Valid DocumentAggregateBatchRequest documents) {}

  public record Update(
      @NotBlank String title,
      @NotNull CentralAccountGroupImportance importance,
      @NotNull Boolean reasonableAssurance,
      String description,
      LocalDate validFrom,
      LocalDate validTo,
      @NotNull Long version,
      @Valid DocumentAggregateBatchRequest documents) {}

  public record Move(UUID parentAccountGroupId, Integer sortOrder, @NotNull Long version) {}

  public record Summary(
      UUID id,
      String code,
      String title,
      UUID parentAccountGroupId,
      CentralAccountGroupImportance importance,
      boolean reasonableAssurance,
      int sortOrder,
      MasterDataLifecycleStatus status,
      LocalDate validFrom,
      LocalDate validTo,
      long version) {}

  public record Detail(
      UUID id,
      String code,
      String title,
      UUID parentAccountGroupId,
      CentralAccountGroupImportance importance,
      boolean reasonableAssurance,
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

  public record Tree(
      UUID id,
      String code,
      String title,
      UUID parentAccountGroupId,
      int sortOrder,
      MasterDataLifecycleStatus status,
      long version,
      List<Tree> children) {}
}
