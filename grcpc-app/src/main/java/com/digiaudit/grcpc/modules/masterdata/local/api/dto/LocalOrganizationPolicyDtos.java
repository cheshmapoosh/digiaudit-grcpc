package com.digiaudit.grcpc.modules.masterdata.local.api.dto;

import com.digiaudit.grcpc.modules.masterdata.local.domain.LocalScopeAction;
import com.digiaudit.grcpc.modules.masterdata.local.domain.LocalPropagationMode;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class LocalOrganizationPolicyDtos {
  private LocalOrganizationPolicyDtos() {}
  public record Create(@NotNull UUID organizationId, @NotNull UUID policyId,
      @NotNull LocalScopeAction scopeAction, @NotNull LocalPropagationMode propagationMode, LocalDate validFrom, LocalDate validTo) {}
  public record Update(@NotNull Long version, @NotNull LocalScopeAction scopeAction,
      @NotNull LocalPropagationMode propagationMode,
      LocalDate validFrom, LocalDate validTo) {}
  public record Lifecycle(@NotNull Long version) {}
  public record Version(long version) {}
  public record Row(UUID id, UUID organizationId, String organizationCode,
      String organizationLabel, 
      UUID policyId, String policyCode, String policyLabel, LocalScopeAction scopeAction,
      LocalPropagationMode propagationMode, MasterDataLifecycleStatus status,
      LocalDate validFrom, LocalDate validTo, long version,
      Instant createdAt, UUID createdBy, Instant updatedAt, UUID updatedBy,
      Instant deletedAt, UUID deletedBy) {}
  public record Page(List<Row> items, int page, int size, long totalElements, int totalPages) {}
  public record Mutation(UUID entityId, long version, UUID revisionId, Row row) {}
}

