package com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.masterdata.assignment.accountgrouprisk.api.dto.AccountGroupRiskAssignmentDtos;
import com.digiaudit.grcpc.modules.masterdata.assignment.accountgrouprisk.api.dto.AccountGroupRiskAssignmentDtos.LifecycleChange;
import com.digiaudit.grcpc.modules.masterdata.assignment.accountgrouprisk.api.dto.AccountGroupRiskAssignmentDtos.Selection;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.enums.CentralAccountGroupImportance;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto.AccountGroupControlSelection;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto.CentralControlAccountGroupResponse;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto.AccountGroupControlObjectiveSelection;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto.CentralControlObjectiveAccountGroupResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class CentralAccountGroupDtos {
  private CentralAccountGroupDtos() {}

  public record AggregateResponse(UUID entityId, UUID revisionId, long version,
      List<DocumentCommandResponse> finalizedDocuments, Detail entity,
      @JsonInclude(JsonInclude.Include.NON_NULL) List<CentralControlAccountGroupResponse> controlClassifications,
      @JsonInclude(JsonInclude.Include.NON_NULL) List<CentralControlObjectiveAccountGroupResponse> controlObjectiveClassifications,
      @JsonInclude(JsonInclude.Include.NON_NULL) List<AccountGroupRiskAssignmentDtos.Response> riskAssignments) {}

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
      @Valid DocumentAggregateBatchRequest documents,
      List<@NotNull @Valid AccountGroupControlSelection> controlsToAdd,
      List<@NotNull @Valid AccountGroupControlObjectiveSelection> controlObjectivesToAdd,
      List<@NotNull @Valid Selection> riskTemplatesToAdd) {}

  public record Update(
      @NotBlank String title,
      @NotNull CentralAccountGroupImportance importance,
      @NotNull Boolean reasonableAssurance,
      String description,
      LocalDate validFrom,
      LocalDate validTo,
      @NotNull Long version,
      @Valid DocumentAggregateBatchRequest documents,
      @Valid ParentChange parentChange,
      MasterDataLifecycleStatus status,
      Integer sortOrder,
      List<@NotNull @Valid AccountGroupControlSelection> controlsToAdd,
      List<@NotNull @Valid AccountGroupControlObjectiveSelection> controlObjectivesToAdd,
      List<@NotNull @Valid ControlLifecycleChange> controlLifecycleChanges,
      List<@NotNull @Valid ControlObjectiveLifecycleChange> controlObjectiveLifecycleChanges,
      List<@NotNull @Valid Selection> riskTemplatesToAdd,
      List<@NotNull @Valid LifecycleChange> riskAssignmentLifecycleChanges) {}

  public enum ClassificationLifecycleOperation { ACTIVATE, INACTIVATE, DELETE }

  public record ControlLifecycleChange(@NotNull UUID controlId, @NotNull UUID classificationId,
      @NotNull @PositiveOrZero Long version, @NotNull ClassificationLifecycleOperation operation) {}

  public record ControlObjectiveLifecycleChange(@NotNull UUID controlObjectiveId, @NotNull UUID classificationId,
      @NotNull @PositiveOrZero Long version, @NotNull ClassificationLifecycleOperation operation) {}

  public record ParentChange(UUID parentAccountGroupId) {}

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
