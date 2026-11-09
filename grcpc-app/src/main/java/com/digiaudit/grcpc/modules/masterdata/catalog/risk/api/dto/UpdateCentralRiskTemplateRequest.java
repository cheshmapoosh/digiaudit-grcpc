package com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.enums.CentralRiskType;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.LocalDate;
import java.util.List;

public record UpdateCentralRiskTemplateRequest(
    @NotNull Long version,
    @NotBlank String title,
    @NotNull CentralRiskType riskType,
    String description,
    LocalDate validFrom,
    LocalDate validTo,
    @Valid DocumentAggregateBatchRequest documents,
    @Valid ParentChange parentChange,
    MasterDataLifecycleStatus status,
    Integer sortOrder,
    List<@NotNull @Valid ControlChange> controlAssignments,
    List<@NotNull @Valid ControlObjectiveChange> controlObjectiveAssignments) {
  public record ParentChange(@NotNull UUID riskCategoryId) {}

  public enum AssignmentOperation { CREATE_OR_RESTORE, ACTIVATE, INACTIVATE, DELETE }

  public record ControlChange(
      @NotNull UUID controlId, @NotNull AssignmentOperation operation,
      @PositiveOrZero Long controlVersion, UUID assignmentId, @PositiveOrZero Long version) {}

  public record ControlObjectiveChange(
      @NotNull UUID controlObjectiveId, @NotNull AssignmentOperation operation,
      @PositiveOrZero Long controlObjectiveVersion, UUID assignmentId, @PositiveOrZero Long version) {}
}
