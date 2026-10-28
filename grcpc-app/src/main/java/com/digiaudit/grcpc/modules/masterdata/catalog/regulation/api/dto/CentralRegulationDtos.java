package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class CentralRegulationDtos {
  private CentralRegulationDtos() {}

  public record RequirementAggregateResponse(UUID entityId, UUID revisionId, long version,
      List<DocumentCommandResponse> finalizedDocuments, RequirementDetail entity) {}

  public record RegulationAggregateResponse(UUID entityId, UUID revisionId, long version,
      List<DocumentCommandResponse> finalizedDocuments, RegulationDetail entity,
      List<RequirementDetail> requirements) {}

  public record GroupAggregateResponse(UUID entityId, UUID revisionId, long version,
      List<DocumentCommandResponse> finalizedDocuments, GroupDetail entity) {}

  public record CreateGroup(
      @NotBlank String code,
      @NotBlank String title,
      UUID parentGroupId,
      String description,
      Integer sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      @Valid DocumentAggregateBatchRequest documents) {}

  public record CreateRegulation(
      @NotBlank String code,
      @NotBlank String title,
      @NotNull UUID regulationGroupId,
      String description,
      Integer sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      @Valid DocumentAggregateBatchRequest documents,
      @Valid @Size(max = 5000) List<@Valid RequirementChange> requirementChanges) {}

  public record CreateRequirement(
      @NotBlank String code,
      @NotBlank String title,
      @NotNull UUID regulationId,
      String description,
      Integer sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      @Valid DocumentAggregateBatchRequest documents) {}

  public record UpdateGroup(
      @NotBlank String title,
      String description,
      LocalDate validFrom,
      LocalDate validTo,
      @NotNull Long version,
      @Valid DocumentAggregateBatchRequest documents,
      @Valid GroupParentChange parentChange,
      MasterDataLifecycleStatus status,
      Integer sortOrder) {}

  public record GroupParentChange(UUID parentGroupId) {}

  public record UpdateRegulation(
      @NotBlank String title,
      String description,
      LocalDate validFrom,
      LocalDate validTo,
      @NotNull Long version,
      @Valid DocumentAggregateBatchRequest documents,
      @Valid RegulationParentChange parentChange,
      MasterDataLifecycleStatus status,
      Integer sortOrder,
      @Valid @Size(max = 5000) List<@Valid RequirementChange> requirementChanges) {}

  public enum RequirementChangeOperation { CREATE, UPDATE, ACTIVATE, INACTIVATE, DELETE }

  /** Structural Requirement children; the parent Regulation remains server-owned. */
  public record RequirementChange(
      @NotNull RequirementChangeOperation operation,
      UUID requirementId,
      Long version,
      String code,
      String title,
      String description,
      Integer sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      MasterDataLifecycleStatus requestedStatus) {}

  public record RegulationParentChange(@NotNull UUID regulationGroupId) {}

  public record UpdateRequirement(
      @NotBlank String title,
      String description,
      LocalDate validFrom,
      LocalDate validTo,
      @NotNull Long version,
      @Valid DocumentAggregateBatchRequest documents,
      @Valid RequirementParentChange parentChange,
      MasterDataLifecycleStatus status,
      Integer sortOrder) {}

  public record RequirementParentChange(@NotNull UUID regulationId) {}

  public record MoveGroup(UUID parentGroupId, Integer sortOrder, @NotNull Long version) {}

  public record MoveRegulation(
      @NotNull UUID regulationGroupId, Integer sortOrder, @NotNull Long version) {}

  public record MoveRequirement(
      @NotNull UUID regulationId, Integer sortOrder, @NotNull Long version) {}

  public record GroupSummary(
      UUID id,
      String code,
      String title,
      UUID parentGroupId,
      int sortOrder,
      MasterDataLifecycleStatus status,
      LocalDate validFrom,
      LocalDate validTo,
      long version) {}

  public record RegulationSummary(
      UUID id,
      String code,
      String title,
      UUID regulationGroupId,
      int sortOrder,
      MasterDataLifecycleStatus status,
      LocalDate validFrom,
      LocalDate validTo,
      long version) {}

  public record RequirementSummary(
      UUID id,
      String code,
      String title,
      UUID regulationId,
      int sortOrder,
      MasterDataLifecycleStatus status,
      LocalDate validFrom,
      LocalDate validTo,
      long version) {}

  public record GroupDetail(
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

  public record RegulationDetail(
      UUID id,
      String code,
      String title,
      UUID regulationGroupId,
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

  public record RequirementDetail(
      UUID id,
      String code,
      String title,
      UUID regulationId,
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

  public record GroupTree(
      UUID id,
      String code,
      String title,
      UUID parentGroupId,
      int sortOrder,
      MasterDataLifecycleStatus status,
      long version,
      List<GroupTree> children) {}
}
