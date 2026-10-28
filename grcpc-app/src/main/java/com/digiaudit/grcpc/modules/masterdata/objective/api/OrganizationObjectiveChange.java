package com.digiaudit.grcpc.modules.masterdata.objective.api;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

/** One final intent for an existing Organization–Objective pair. */
public record OrganizationObjectiveChange(
    @NotNull Operation operation, UUID assignmentId, Long version,
    UUID objectiveId, UUID organizationId, String name, String description, String owner,
    LocalDate validFrom, LocalDate validTo, MasterDataLifecycleStatus requestedStatus) {
  public enum Operation { CREATE_OR_RESTORE, UPDATE, ACTIVATE, INACTIVATE, DELETE, RESTORE }
}
