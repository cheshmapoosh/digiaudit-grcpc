package com.digiaudit.grcpc.modules.masterdata.objective.api;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class ObjectiveDtos {
  private ObjectiveDtos() {}
  public record Create(@NotBlank String code, @NotBlank String name, String description,
      String objectiveType, UUID parentObjectiveId, LocalDate validFrom, LocalDate validTo,
      @Valid DocumentAggregateBatchRequest documents) {}
  public record Update(@NotBlank String name, String description, String objectiveType,
      UUID parentObjectiveId, LocalDate validFrom, LocalDate validTo, @NotNull Long version,
      @Valid DocumentAggregateBatchRequest documents) {}
  public record Detail(UUID id, String nodeType, String code, String name, String description, String objectiveType,
      UUID parentObjectiveId, LocalDate validFrom, LocalDate validTo,
      MasterDataLifecycleStatus status, long version, Instant createdAt, Instant updatedAt) {}
}
