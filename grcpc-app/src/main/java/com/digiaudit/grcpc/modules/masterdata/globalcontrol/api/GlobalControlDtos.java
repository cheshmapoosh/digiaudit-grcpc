package com.digiaudit.grcpc.modules.masterdata.globalcontrol.api;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class GlobalControlDtos {
  private GlobalControlDtos() {}

  public record Create(@NotBlank String code, @NotBlank String name, String description,
      @NotNull UUID controlGroupId, @NotBlank String controlType, @NotNull Boolean testRequired,
      LocalDate validFrom, LocalDate validTo, List<@NotNull UUID> regulationIds,
      @Valid DocumentAggregateBatchRequest documents) {
    public Create(String code, String name, String description, UUID controlGroupId,
        String controlType, Boolean testRequired, LocalDate validFrom, LocalDate validTo,
        DocumentAggregateBatchRequest documents) {
      this(code, name, description, controlGroupId, controlType, testRequired,
          validFrom, validTo, null, documents);
    }
  }

  public record Update(@NotBlank String name, String description, @NotNull UUID controlGroupId,
      @NotBlank String controlType, @NotNull Boolean testRequired, LocalDate validFrom,
      LocalDate validTo, @NotNull Long version, List<@NotNull UUID> regulationIds,
      @Valid DocumentAggregateBatchRequest documents) {
    public Update(String name, String description, UUID controlGroupId, String controlType,
        Boolean testRequired, LocalDate validFrom, LocalDate validTo, Long version,
        DocumentAggregateBatchRequest documents) {
      this(name, description, controlGroupId, controlType, testRequired, validFrom,
          validTo, version, null, documents);
    }
  }

  public record Detail(UUID id, String nodeType, String code, String name, String description,
      UUID controlGroupId, String controlType, boolean testRequired, LocalDate validFrom,
      LocalDate validTo, MasterDataLifecycleStatus status, long version,
      Instant createdAt, Instant updatedAt) {}
}
