package com.digiaudit.grcpc.modules.masterdata.assignment.accountgrouprisk.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.LocalDate;
import java.util.UUID;

public final class AccountGroupRiskAssignmentDtos {
  private AccountGroupRiskAssignmentDtos() {}

  public record Selection(@NotNull UUID riskTemplateId, @NotNull @PositiveOrZero Long version) {}

  public enum LifecycleOperation { ACTIVATE, INACTIVATE, DELETE }

  public record LifecycleChange(@NotNull UUID riskTemplateId, @NotNull UUID assignmentId,
      @NotNull @PositiveOrZero Long version, @NotNull LifecycleOperation operation) {}

  public record Response(UUID assignmentId, UUID riskTemplateId, String riskTemplateCode,
      String riskTemplateTitle, MasterDataLifecycleStatus riskTemplateStatus,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version) {}
}
