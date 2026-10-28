package com.digiaudit.grcpc.modules.masterdata.globalcontrol.api;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import java.util.List;

public final class GlobalControlRegulationDtos {
  private GlobalControlRegulationDtos() {}

  public record Attach(@NotNull UUID regulationId) {}
  public enum Operation { CREATE_OR_RESTORE, ACTIVATE, INACTIVATE, DELETE, RESTORE }
  public record Change(@NotNull UUID regulationId, @NotNull Operation operation, UUID relationId, Long version) {}
  public record RegulationOption(UUID id, String code, String name) {}
  public record SelectionGroup(UUID id, UUID parentId, String code, String name) {}
  public record SelectionOptions(List<SelectionGroup> groups, List<RegulationOptionWithGroup> regulations) {}
  public record RegulationOptionWithGroup(UUID id, UUID groupId, String code, String name) {}
  public record Link(UUID id, UUID globalControlId, UUID regulationId,
      String regulationCode, String regulationName,
      com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus status,
      com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus regulationStatus,
      long version) {}
}
