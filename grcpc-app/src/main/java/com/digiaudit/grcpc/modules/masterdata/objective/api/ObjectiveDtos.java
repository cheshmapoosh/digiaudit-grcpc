package com.digiaudit.grcpc.modules.masterdata.objective.api;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.ObjectiveKind;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class ObjectiveDtos {
  private ObjectiveDtos() {}
  public record Create(@NotBlank String code, @NotBlank String name, String description,
      String objectiveType, UUID parentObjectiveId, LocalDate validFrom, LocalDate validTo,
      List<@NotNull UUID> organizationIds, @Valid DocumentAggregateBatchRequest documents,
      ObjectiveKind kind) {
    public Create(String code, String name, String description, String objectiveType,
        UUID parentObjectiveId, LocalDate validFrom, LocalDate validTo,
        List<UUID> organizationIds, DocumentAggregateBatchRequest documents) {
      this(code, name, description, objectiveType, parentObjectiveId, validFrom, validTo,
          organizationIds, documents, ObjectiveKind.OBJECTIVE);
    }
    public Create(String code, String name, String description, String objectiveType,
        UUID parentObjectiveId, LocalDate validFrom, LocalDate validTo,
        DocumentAggregateBatchRequest documents) {
      this(code, name, description, objectiveType, parentObjectiveId, validFrom, validTo,
          null, documents, ObjectiveKind.OBJECTIVE);
    }
  }
  public record Update(@NotBlank String name, String description, String objectiveType,
      UUID parentObjectiveId, LocalDate validFrom, LocalDate validTo, @NotNull Long version,
      List<@NotNull UUID> organizationIds, @Valid DocumentAggregateBatchRequest documents,
      ObjectiveKind kind) {
    public Update(String name, String description, String objectiveType,
        UUID parentObjectiveId, LocalDate validFrom, LocalDate validTo, Long version,
        List<UUID> organizationIds, DocumentAggregateBatchRequest documents) {
      this(name, description, objectiveType, parentObjectiveId, validFrom, validTo,
          version, organizationIds, documents, null);
    }
    public Update(String name, String description, String objectiveType,
        UUID parentObjectiveId, LocalDate validFrom, LocalDate validTo, Long version,
        DocumentAggregateBatchRequest documents) {
      this(name, description, objectiveType, parentObjectiveId, validFrom, validTo,
          version, null, documents, null);
    }
  }
  public record Detail(UUID id, String nodeType, String code, String name, String description, String objectiveType,
      UUID parentObjectiveId, LocalDate validFrom, LocalDate validTo,
      MasterDataLifecycleStatus status, long version, Instant createdAt, Instant updatedAt,
      ObjectiveKind kind) {}

  public record Restore(@NotNull Long version, UUID parentObjectiveId) {}
}
