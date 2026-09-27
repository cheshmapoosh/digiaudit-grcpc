package com.digiaudit.grcpc.modules.masterdata.local.api.dto;

import com.digiaudit.grcpc.modules.masterdata.local.domain.LocalSourceType;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class LocalControlDtos {
  private LocalControlDtos() {}
  public record Create(@NotNull UUID controlId, @NotNull LocalSourceType sourceType,
      UUID centralControlScopeId, UUID actualOwnerId, String frequencyCode,
      String executionMethodCode, String testMethodCode, String localContextNote,
      LocalDate validFrom, LocalDate validTo) {}
  public record Assignment(@NotNull UUID organizationId, @NotNull UUID subprocessId,
      @NotNull UUID controlId, @NotNull LocalSourceType sourceType, UUID centralControlScopeId,
      UUID actualOwnerId, String frequencyCode, String executionMethodCode,
      String testMethodCode, String localContextNote, LocalDate validFrom, LocalDate validTo) {
    public Create control() {
      return new Create(controlId, sourceType, centralControlScopeId, actualOwnerId,
          frequencyCode, executionMethodCode, testMethodCode, localContextNote,
          validFrom, validTo);
    }
  }
  public record Update(@NotNull Long version, UUID actualOwnerId, String frequencyCode,
      String executionMethodCode, String testMethodCode, String localContextNote,
      LocalDate validFrom, LocalDate validTo) {}
  public record Lifecycle(@NotNull Long version) {}
  public record Version(long version) {}
  public record Row(UUID id, UUID organizationId, String organizationCode,
      String organizationLabel, UUID organizationSubprocessScopeId,
      UUID subprocessId, String subprocessCode, String subprocessLabel,
      MasterDataLifecycleStatus contextStatus, UUID controlId, String controlCode,
      String controlLabel, UUID centralControlScopeId,
      MasterDataLifecycleStatus centralReferenceStatus, LocalDate centralReferenceValidFrom,
      LocalDate centralReferenceValidTo, LocalSourceType sourceType,
      UUID actualOwnerId, String actualOwnerLabel, String frequencyCode,
      String executionMethodCode, String testMethodCode, String localContextNote,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo,
      long version, Instant createdAt, UUID createdBy, Instant updatedAt,
      UUID updatedBy, Instant deletedAt, UUID deletedBy) {}
  public record Page(List<Row> items, int page, int size, long totalElements, int totalPages) {}
  public record Mutation(UUID entityId, long version, UUID revisionId, Row row) {}
  public record AssignmentMutation(UUID revisionId, UUID organizationId, UUID contextId,
      long contextVersion, UUID localControlScopeId, long localControlScopeVersion,
      boolean contextCreated) {}
}
