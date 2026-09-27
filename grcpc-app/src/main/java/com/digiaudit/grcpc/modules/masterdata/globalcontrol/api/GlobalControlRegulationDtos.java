package com.digiaudit.grcpc.modules.masterdata.globalcontrol.api;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public final class GlobalControlRegulationDtos {
  private GlobalControlRegulationDtos() {}

  public record Attach(@NotNull UUID regulationId) {}
  public record RegulationOption(UUID id, String code, String name) {}
  public record Link(UUID id, UUID globalControlId, UUID regulationId,
      String regulationCode, String regulationName, long version) {}
}
