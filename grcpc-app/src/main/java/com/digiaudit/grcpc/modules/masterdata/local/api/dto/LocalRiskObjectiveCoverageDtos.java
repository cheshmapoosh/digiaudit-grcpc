package com.digiaudit.grcpc.modules.masterdata.local.api.dto;

import com.digiaudit.grcpc.modules.masterdata.local.domain.LocalSourceType;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class LocalRiskObjectiveCoverageDtos {
  private LocalRiskObjectiveCoverageDtos() {}
  public record Create(@NotNull UUID localRiskScopeId, @NotNull UUID localControlObjectiveScopeId,
      @NotNull LocalSourceType sourceType, UUID centralRiskControlObjectiveCoverageId, String coverageNote,
      LocalDate validFrom, LocalDate validTo) {}
  public record Update(@NotNull Long version, String coverageNote,
      LocalDate validFrom, LocalDate validTo) {}
  public record Lifecycle(@NotNull Long version) {}
  public record Version(long version) {}
  public record Row(UUID id, UUID organizationId, String organizationCode,
      String organizationLabel, UUID organizationSubprocessScopeId, UUID subprocessId,
      String subprocessCode, String subprocessLabel, MasterDataLifecycleStatus contextStatus,
      UUID localRiskScopeId, MasterDataLifecycleStatus localRiskScopeStatus,
      UUID riskTemplateId, String riskTemplateCode, String riskTemplateLabel,
      UUID localControlObjectiveScopeId, MasterDataLifecycleStatus localObjectiveScopeStatus,
      UUID controlObjectiveId, String controlObjectiveCode, String controlObjectiveLabel,
      UUID centralRiskControlObjectiveCoverageId, MasterDataLifecycleStatus centralReferenceStatus,
      LocalDate centralReferenceValidFrom, LocalDate centralReferenceValidTo,
      LocalSourceType sourceType, String coverageNote, MasterDataLifecycleStatus status,
      LocalDate validFrom, LocalDate validTo, long version,
      Instant createdAt, UUID createdBy, Instant updatedAt, UUID updatedBy,
      Instant deletedAt, UUID deletedBy) {}
  public record Page(List<Row> items, int page, int size, long totalElements, int totalPages) {}
  public record Mutation(UUID entityId, long version, UUID revisionId, Row row) {}
}

