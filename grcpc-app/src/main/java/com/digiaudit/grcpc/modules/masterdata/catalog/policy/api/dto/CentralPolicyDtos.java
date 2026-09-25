package com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.CentralPolicyType;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.PolicyCommunicationMethod;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class CentralPolicyDtos {
  private CentralPolicyDtos() {}

  public record CreateGroup(
      @NotBlank String code,
      @NotBlank String title,
      UUID parentGroupId,
      String description,
      Integer sortOrder,
      LocalDate validFrom,
      LocalDate validTo,
      @Valid DocumentAggregateBatchRequest documents) {}

  public record CreatePolicy(
      @NotBlank String code,
      @NotBlank String title,
      @NotNull UUID policyGroupId,
      @NotNull CentralPolicyType policyType,
      String responsibleOrganization,
      PolicyCommunicationMethod communicationMethod,
      LocalDate nextReviewDate,
      String objective,
      String content,
      String description,
      Integer sortOrder,
      MasterDataLifecycleStatus status,
      LocalDate validFrom,
      LocalDate validTo,
      List<PolicySubprocessScopeChange> subprocessScopeChanges,
      List<PolicyOrganizationScopeChange> organizationScopeChanges,
      List<PolicyControlScopeChange> controlScopeChanges,
      List<PolicyRequirementScopeChange> requirementScopeChanges,
      @Valid DocumentAggregateBatchRequest documents) {}

  public record UpdateGroup(
      @NotBlank String title,
      String description,
      LocalDate validFrom,
      LocalDate validTo,
      @NotNull Long version,
      @Valid DocumentAggregateBatchRequest documents) {}

  public record UpdatePolicy(
      @NotBlank String title,
      @NotNull CentralPolicyType policyType,
      String responsibleOrganization,
      PolicyCommunicationMethod communicationMethod,
      LocalDate nextReviewDate,
      String objective,
      String content,
      String description,
      @NotNull UUID policyGroupId,
      Integer sortOrder,
      MasterDataLifecycleStatus status,
      LocalDate validFrom,
      LocalDate validTo,
      @NotNull Long version,
      List<PolicySubprocessScopeChange> subprocessScopeChanges,
      List<PolicyOrganizationScopeChange> organizationScopeChanges,
      List<PolicyControlScopeChange> controlScopeChanges,
      List<PolicyRequirementScopeChange> requirementScopeChanges,
      @Valid DocumentAggregateBatchRequest documents) {}

  public record MoveGroup(UUID parentGroupId, Integer sortOrder, @NotNull Long version) {}

  public record MovePolicy(@NotNull UUID policyGroupId, Integer sortOrder, @NotNull Long version) {}

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

  public record PolicySummary(
      UUID id,
      String code,
      String title,
      UUID policyGroupId,
      CentralPolicyType policyType,
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

  public record PolicyDetail(
      UUID id,
      String code,
      String title,
      UUID policyGroupId,
      CentralPolicyType policyType,
      String responsibleOrganization,
      PolicyCommunicationMethod communicationMethod,
      LocalDate nextReviewDate,
      String objective,
      String content,
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

  public enum PolicyScopeChangeOperation {
    CREATE_OR_RESTORE, UPDATE, ACTIVATE, INACTIVATE, DELETE, RESTORE
  }
  public record PolicySubprocessScopeChange(
      PolicyScopeChangeOperation operation, UUID relationId, UUID subprocessId,
      Long version, LocalDate validFrom, LocalDate validTo,
      MasterDataLifecycleStatus requestedStatus) {}
  public record PolicyOrganizationScopeChange(
      PolicyScopeChangeOperation operation, UUID relationId, UUID organizationId,
      Long version, LocalDate validFrom, LocalDate validTo,
      MasterDataLifecycleStatus requestedStatus) {}
  public record PolicyControlScopeChange(
      PolicyScopeChangeOperation operation, UUID relationId, UUID centralControlScopeId,
      Long version, LocalDate validFrom, LocalDate validTo,
      MasterDataLifecycleStatus requestedStatus) {}
  public record PolicyRequirementScopeChange(
      PolicyScopeChangeOperation operation, UUID relationId, UUID centralRequirementScopeId,
      Long version, LocalDate validFrom, LocalDate validTo,
      MasterDataLifecycleStatus requestedStatus) {}

  public record PolicySubprocessScopeResponse(UUID id, UUID policyId, UUID subprocessId,
      String subprocessCode, String subprocessTitle, UUID processId, String processCode, String processTitle,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version) {}
  public record PolicyOrganizationScopeResponse(UUID id, UUID policyId, UUID organizationId,
      String organizationCode, String organizationTitle, UUID parentOrganizationId,
      String parentOrganizationCode, String parentOrganizationTitle,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version) {}
  public record PolicyControlScopeResponse(UUID id, UUID policyId, UUID centralControlScopeId,
      UUID subprocessId, String subprocessCode, String subprocessTitle,
      UUID controlId, String controlCode, String controlTitle, String controlGroupCode, String controlGroupTitle,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version) {}
  public record PolicyRequirementScopeResponse(UUID id, UUID policyId, UUID centralRequirementScopeId,
      UUID subprocessId, String subprocessCode, String subprocessTitle,
      UUID requirementId, String requirementCode, String requirementTitle, String regulationCode, String regulationTitle,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version) {}

  public record PolicySubprocessOption(UUID subprocessId, String code, String title,
      UUID processId, String processCode, String processTitle,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo) {}
  public record PolicyOrganizationOption(UUID organizationId, String code, String title,
      UUID parentOrganizationId, String parentOrganizationCode, String parentOrganizationTitle,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo) {}
  public record PolicyControlOption(UUID centralControlScopeId, UUID subprocessId,
      String subprocessCode, String subprocessTitle, UUID controlId, String controlCode,
      String controlTitle, String controlGroupCode, String controlGroupTitle,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo) {}
  public record PolicyRequirementOption(UUID centralRequirementScopeId, UUID subprocessId,
      String subprocessCode, String subprocessTitle, UUID requirementId, String requirementCode,
      String requirementTitle, String regulationCode, String regulationTitle,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo) {}

  public record PolicyAggregateResponse(
      UUID entityId, UUID revisionId, long version,
      List<DocumentCommandResponse> finalizedDocuments,
      List<PolicySubprocessScopeResponse> subprocessScopes,
      List<PolicyOrganizationScopeResponse> organizationScopes,
      List<PolicyControlScopeResponse> controlScopes,
      List<PolicyRequirementScopeResponse> requirementScopes) {}

}
