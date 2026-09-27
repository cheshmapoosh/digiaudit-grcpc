package com.digiaudit.grcpc.modules.masterdata.local.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class LocalOptionDtos {
  private LocalOptionDtos() {}

  public record Page<T>(List<T> items, int page, int size, long totalElements, int totalPages) {}
  public record Catalog(UUID id, String code, String displayLabel,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version) {}
  public record Requirement(UUID id, String code, String displayLabel,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version,
      UUID regulationId, String regulationCode, String regulationLabel,
      UUID regulationGroupId, String regulationGroupCode, String regulationGroupLabel) {}
  public record Owner(UUID id, String displayLabel) {}
  public record ControlSettings(List<String> frequencyCodes,
      List<String> executionMethodCodes, List<String> testMethodCodes) {}
  public record Scope(UUID id, UUID subprocessId, UUID definitionId,
      String definitionCode, String definitionLabel, MasterDataLifecycleStatus status,
      LocalDate validFrom, LocalDate validTo, long version) {}
  public record ControlScope(UUID id, UUID subprocessId, UUID controlId,
      String controlCode, String controlLabel, MasterDataLifecycleStatus status,
      LocalDate validFrom, LocalDate validTo, long version) {}
  public record RiskScope(UUID id, UUID subprocessId, UUID riskTemplateId,
      String riskTemplateCode, String riskTemplateLabel, MasterDataLifecycleStatus status,
      LocalDate validFrom, LocalDate validTo, long version) {}
  public record ObjectiveScope(UUID id, UUID subprocessId, UUID controlObjectiveId,
      String controlObjectiveCode, String controlObjectiveLabel, MasterDataLifecycleStatus status,
      LocalDate validFrom, LocalDate validTo, long version) {}
  public record RequirementScope(UUID id, UUID subprocessId, UUID requirementId,
      String requirementCode, String requirementLabel, MasterDataLifecycleStatus status,
      LocalDate validFrom, LocalDate validTo, long version) {}
  public record Coverage(UUID id, UUID subprocessId, UUID leftScopeId,
      UUID rightScopeId, UUID leftDefinitionId, UUID rightDefinitionId,
      String leftDefinitionCode, String leftDefinitionLabel,
      String rightDefinitionCode, String rightDefinitionLabel,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version) {}
  public record RiskControlCoverage(UUID id, UUID subprocessId,
      UUID riskScopeId, UUID controlScopeId, UUID riskTemplateId, UUID controlId,
      String riskTemplateCode, String riskTemplateLabel, String controlCode, String controlLabel,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version) {}
  public record RiskObjectiveCoverage(UUID id, UUID subprocessId,
      UUID riskScopeId, UUID controlObjectiveScopeId, UUID riskTemplateId, UUID controlObjectiveId,
      String riskTemplateCode, String riskTemplateLabel,
      String controlObjectiveCode, String controlObjectiveLabel,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version) {}
  public record ControlObjectiveCoverage(UUID id, UUID subprocessId,
      UUID controlScopeId, UUID controlObjectiveScopeId, UUID controlId, UUID controlObjectiveId,
      String controlCode, String controlLabel, String controlObjectiveCode,
      String controlObjectiveLabel, MasterDataLifecycleStatus status,
      LocalDate validFrom, LocalDate validTo, long version) {}
  public record RequirementControlCoverage(UUID id, UUID subprocessId,
      UUID requirementScopeId, UUID controlScopeId, UUID requirementId, UUID controlId,
      String requirementCode, String requirementLabel, String controlCode, String controlLabel,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version) {}
}
