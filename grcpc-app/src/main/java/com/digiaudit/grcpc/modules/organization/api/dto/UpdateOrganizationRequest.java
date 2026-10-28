package com.digiaudit.grcpc.modules.organization.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.organization.domain.OrganizationType;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalContextDtos.ContextChange;
import com.digiaudit.grcpc.modules.masterdata.local.api.dto.OrganizationLocalDtos.*;
import com.digiaudit.grcpc.modules.masterdata.objective.api.OrganizationObjectiveChange;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record UpdateOrganizationRequest(
        @NotNull
        Long version,
        @NotBlank
        @Size(max = 255)
        String name,
        OrganizationType organizationType,
        UUID organizationTypeId,
        @NotNull
        MasterDataLifecycleStatus status,
        UUID parentOrganizationId,
        java.util.List<@NotNull @Valid OrganizationOwnerChange> ownerAssignments,
        java.util.List<@NotNull @Valid ContextChange> subprocesses,
        java.util.List<@NotNull @Valid ControlChange> localControlScopeChanges,
        java.util.List<@NotNull @Valid RiskChange> localRiskScopeChanges,
        java.util.List<@NotNull @Valid ObjectiveChange> localControlObjectiveScopeChanges,
        java.util.List<@NotNull @Valid RequirementChange> localRequirementScopeChanges,
        java.util.List<@NotNull @Valid OrganizationPolicyChange> localOrganizationPolicyChanges,
        java.util.List<@NotNull @Valid ContextPolicyChange> localContextPolicyChanges,
        java.util.List<@NotNull @Valid ControlPolicyChange> localControlPolicyChanges,
        java.util.List<@NotNull @Valid RequirementPolicyChange> localRequirementPolicyChanges,
        java.util.List<@NotNull @Valid OrganizationObjectiveChange> organizationObjectiveChanges,
        @Size(max = 255)
        String location,
        String description,
        LocalDate validFrom,
        LocalDate validTo,
        @Valid DocumentAggregateBatchRequest documents
) implements com.digiaudit.grcpc.modules.masterdata.local.api.dto.OrganizationLocalDrafts {
}
