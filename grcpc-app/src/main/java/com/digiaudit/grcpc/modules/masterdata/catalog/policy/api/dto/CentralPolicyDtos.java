package com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.CentralPolicyType;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.PolicyCommunicationMethod;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.PolicyVersionStatus;
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
      String communicationTiming,
      LocalDate nextReviewDate,
      String objective,
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
      @Valid DocumentAggregateBatchRequest documents) {}

  public record UpdatePolicy(
      @NotBlank String title,
      @NotNull CentralPolicyType policyType,
      String responsibleOrganization,
      PolicyCommunicationMethod communicationMethod,
      String communicationTiming,
      LocalDate nextReviewDate,
      String objective,
      String description,
      LocalDate validFrom,
      LocalDate validTo,
      @NotNull Long version,
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
      String communicationTiming,
      LocalDate nextReviewDate,
      String objective,
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

  public record CreateVersion(
      String content,
      LocalDate validFrom,
      LocalDate validTo,
      @Valid DocumentAggregateBatchRequest documents) {}

  public record UpdateVersion(
      String content,
      LocalDate validFrom,
      LocalDate validTo,
      @NotNull Long version,
      @Valid DocumentAggregateBatchRequest documents) {}

  public record VersionCommand(@NotNull Long version) {}

  public record VersionDetail(
      UUID id,
      UUID policyId,
      int versionNumber,
      String content,
      PolicyVersionStatus versionStatus,
      Instant publishedAt,
      UUID publishedBy,
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
}
