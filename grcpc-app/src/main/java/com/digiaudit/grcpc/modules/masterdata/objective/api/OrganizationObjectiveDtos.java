package com.digiaudit.grcpc.modules.masterdata.objective.api;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class OrganizationObjectiveDtos {
  private OrganizationObjectiveDtos() {}
  public record Create(@NotNull UUID objectiveId, String name, String description, String owner,
      LocalDate validFrom, LocalDate validTo) {}
  public record Update(@NotBlank String name, String description, String owner,
      LocalDate validFrom, LocalDate validTo, @NotNull Long version) {}
  public record Detail(UUID id, UUID organizationId, UUID objectiveId, String objectiveCode,
      String name, String description, String owner, LocalDate validFrom, LocalDate validTo,
      MasterDataLifecycleStatus status, long version, Instant createdAt, Instant updatedAt) {}
}
