package com.digiaudit.grcpc.modules.masterdata.local.api.dto;
import com.digiaudit.grcpc.modules.masterdata.local.domain.*;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.*;
/** Closed, typed Organization draft references. No client-generated persistence identities. */
public final class OrganizationLocalDtos {
  private OrganizationLocalDtos() {}
  public enum Operation { CREATE_OR_RESTORE, UPDATE, ACTIVATE, INACTIVATE, DELETE, RESTORE }
  public record ContextRef(UUID contextId, UUID subprocessId) {}
  public record ControlScopeRef(UUID localControlScopeId, @Valid ContextRef contextRef, UUID controlId) {}
  public record RequirementScopeRef(UUID localRequirementScopeId, @Valid ContextRef contextRef, UUID requirementId) {}
  public record ControlChange(@NotNull @Valid ContextRef contextRef, @NotNull UUID controlId,
      @NotNull Operation operation, UUID scopeId, Long version, LocalSourceType sourceType, UUID centralControlScopeId,
      UUID actualOwnerId, String frequencyCode, String executionMethodCode, String testMethodCode, String localContextNote,
      LocalDate validFrom, LocalDate validTo, MasterDataLifecycleStatus requestedStatus) {}
  public record RiskChange(@NotNull @Valid ContextRef contextRef, @NotNull UUID riskTemplateId,
      @NotNull Operation operation, UUID scopeId, Long version, LocalSourceType sourceType, UUID centralRiskScopeId,
      LocalDate validFrom, LocalDate validTo, MasterDataLifecycleStatus requestedStatus) {}
  public record ObjectiveChange(@NotNull @Valid ContextRef contextRef, @NotNull UUID controlObjectiveId,
      @NotNull Operation operation, UUID scopeId, Long version, LocalSourceType sourceType, UUID centralControlObjectiveScopeId,
      LocalDate validFrom, LocalDate validTo, MasterDataLifecycleStatus requestedStatus) {}
  public record RequirementChange(@NotNull @Valid ContextRef contextRef, @NotNull UUID requirementId,
      @NotNull Operation operation, UUID scopeId, Long version, LocalSourceType sourceType, UUID centralRequirementScopeId,
      LocalDate validFrom, LocalDate validTo, MasterDataLifecycleStatus requestedStatus) {}
  public record OrganizationPolicyChange(@NotNull UUID policyId,
      @NotNull Operation operation, UUID relationId, Long version, LocalScopeAction scopeAction, LocalPropagationMode propagationMode, 
      LocalDate validFrom, LocalDate validTo, MasterDataLifecycleStatus requestedStatus) {}
  public record ContextPolicyChange(@NotNull @Valid ContextRef contextRef, @NotNull UUID policyId,
      @NotNull Operation operation, UUID relationId, Long version, LocalScopeAction scopeAction, 
      LocalDate validFrom, LocalDate validTo, MasterDataLifecycleStatus requestedStatus) {}
  public record ControlPolicyChange(@NotNull @Valid ControlScopeRef controlScopeRef, @NotNull UUID policyId,
      @NotNull Operation operation, UUID relationId, Long version, LocalScopeAction scopeAction, 
      LocalDate validFrom, LocalDate validTo, MasterDataLifecycleStatus requestedStatus) {}
  public record RequirementPolicyChange(@NotNull @Valid RequirementScopeRef requirementScopeRef, @NotNull UUID policyId,
      @NotNull Operation operation, UUID relationId, Long version, LocalScopeAction scopeAction, 
      LocalDate validFrom, LocalDate validTo, MasterDataLifecycleStatus requestedStatus) {}
  public record Result(UUID revisionId, List<LocalContextDtos.Row> contexts,
      List<LocalControlDtos.Row> controls, List<LocalRiskDtos.Row> risks,
      List<LocalObjectiveDtos.Row> controlObjectives, List<LocalRequirementDtos.Row> requirements,
      List<LocalOrganizationPolicyDtos.Row> organizationPolicies, List<LocalContextPolicyDtos.Row> contextPolicies,
      List<LocalControlPolicyDtos.Row> controlPolicies, List<LocalRequirementPolicyDtos.Row> requirementPolicies,
      List<com.digiaudit.grcpc.modules.masterdata.objective.api.OrganizationObjectiveDtos.Detail> objectives) {}
}
