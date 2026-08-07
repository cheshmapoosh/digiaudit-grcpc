package com.digiaudit.grcpc.modules.masterdata.catalog.shared.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionResult;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionOperationResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataAggregateMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

@Component
public class CatalogCommandSupport {
  private final ObjectMapper objectMapper;

  public CatalogCommandSupport(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public String normalizeCode(String code) {
    if (code == null || code.isBlank()) {
      throw new UnprocessableEntityException(
          "CODE_REQUIRED", "error.masterdata.v2.codeRequired", "Code is required");
    }
    String normalized = code.trim().toUpperCase(Locale.ROOT);
    if (normalized.getBytes(StandardCharsets.UTF_8).length > 64) {
      throw new UnprocessableEntityException(
          "INVALID_CODE_LENGTH",
          "error.masterdata.v2.codeLength",
          "Code exceeds 64 bytes",
          normalized);
    }
    return normalized;
  }

  public String normalizeTitle(String title) {
    if (title == null || title.isBlank()) {
      throw new UnprocessableEntityException(
          "INVALID_TITLE", "error.masterdata.v2.titleRequired", "Title is required");
    }
    String normalized = title.trim();
    if (normalized.length() > 255) {
      throw new UnprocessableEntityException(
          "INVALID_TITLE", "error.masterdata.v2.titleLength", "Title exceeds 255 characters");
    }
    return normalized;
  }

  public String normalizeDescription(String description) {
    return description == null || description.isBlank() ? null : description.trim();
  }

  public int normalizeSortOrder(Integer sortOrder) {
    int normalized = sortOrder == null ? 0 : sortOrder;
    if (normalized < 0) {
      throw new UnprocessableEntityException(
          "INVALID_SORT_ORDER",
          "error.masterdata.v2.invalidSortOrder",
          "Sort order must not be negative",
          normalized);
    }
    return normalized;
  }

  public void validateValidity(LocalDate validFrom, LocalDate validTo) {
    if (validFrom != null && validTo != null && validTo.isBefore(validFrom)) {
      throw new UnprocessableEntityException(
          "DATE_RANGE_INVALID",
          "error.masterdata.v2.invalidValidityRange",
          "Validity range is invalid");
    }
  }

  public long requireVersion(Long version) {
    if (version == null || version < 0) {
      throw new ConflictException(
          "VERSION_CONFLICT",
          "error.masterdata.v2.versionConflict",
          "Expected version is required");
    }
    return version;
  }

  public void assertVersion(CentralDefinitionEntity entity, long expectedVersion) {
    if (entity.getVersion() != expectedVersion) {
      throw new ConflictException(
          "VERSION_CONFLICT",
          "error.masterdata.v2.versionConflict",
          "The record has changed",
          entity.getId());
    }
  }

  public void validateLifecycle(
      CentralDefinitionEntity entity, RevisionOperationType operationType) {
    MasterDataLifecycleStatus current = entity.getStatus();
    boolean valid =
        switch (operationType) {
          case ACTIVATE -> current == MasterDataLifecycleStatus.INACTIVE;
          case INACTIVATE -> current == MasterDataLifecycleStatus.ACTIVE;
          case DELETE ->
              current == MasterDataLifecycleStatus.ACTIVE
                  || current == MasterDataLifecycleStatus.INACTIVE;
          case RESTORE -> current == MasterDataLifecycleStatus.DELETED;
          default -> false;
        };
    if (!valid) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_TRANSITION",
          "error.masterdata.v2.invalidLifecycleTransition",
          "Invalid lifecycle transition");
    }
  }

  public ConflictException duplicate(String code) {
    return new ConflictException(
        "DUPLICATE_BUSINESS_KEY",
        "error.masterdata.v2.duplicateBusinessKey",
        "A record with this code already exists",
        code);
  }

  public RuntimeException translateBusinessKeyViolation(
      DataIntegrityViolationException exception, String constraintName, String code) {
    if (containsConstraint(exception, constraintName)) {
      return duplicate(code);
    }
    return exception;
  }

  public boolean containsConstraint(Throwable exception, String constraintName) {
    String expected = constraintName.toUpperCase(Locale.ROOT);
    Throwable cursor = exception;
    while (cursor != null) {
      String message = cursor.getMessage();
      if (message != null && message.toUpperCase(Locale.ROOT).contains(expected)) {
        return true;
      }
      cursor = cursor.getCause();
    }
    return false;
  }

  public JsonNode snapshot(CentralDefinitionEntity entity) {
    return snapshot(entity, Map.of());
  }

  public JsonNode snapshot(CentralDefinitionEntity entity, Map<String, ?> typedFields) {
    Map<String, Object> snapshot = new LinkedHashMap<>();
    snapshot.put("id", entity.getId());
    snapshot.put("code", entity.getCode());
    snapshot.put("title", entity.getTitle());
    snapshot.putAll(typedFields);
    snapshot.put("description", entity.getDescription());
    snapshot.put("status", entity.getStatus().wireValue());
    snapshot.put("validFrom", entity.getValidFrom());
    snapshot.put("validTo", entity.getValidTo());
    snapshot.put("version", entity.getVersion());
    snapshot.put("createdAt", entity.getCreatedAt());
    snapshot.put("createdBy", entity.getCreatedBy());
    snapshot.put("updatedAt", entity.getUpdatedAt());
    snapshot.put("updatedBy", entity.getUpdatedBy());
    snapshot.put("deletedAt", entity.getDeletedAt());
    snapshot.put("deletedBy", entity.getDeletedBy());
    return objectMapper.valueToTree(snapshot);
  }

  public RevisionOperationResult completed(
      RevisionExecutionContext context,
      CentralDefinitionEntity entity,
      RevisionEntityType entityType,
      RevisionOperationType operationType,
      Long expectedVersion,
      JsonNode before,
      Map<String, ?> typedFields) {
    MasterDataMutationResult primary =
        new MasterDataMutationResult(entity.getId(), context.revisionId(), entity.getVersion());
    return RevisionOperationResult.completed(
        context,
        primary,
        List.of(
            RevisionContentResult.completed(
                entityType,
                entity.getId(),
                operationType,
                expectedVersion,
                before,
                snapshot(entity, typedFields),
                entity.getVersion(),
                objectMapper.valueToTree(Map.of("validated", true)))));
  }

  public MasterDataAggregateMutationResponse aggregateResponse(
      RevisionExecutionResult result, List<DocumentCommandResponse> documents) {
    MasterDataMutationResult primary = result.primaryResult();
    return new MasterDataAggregateMutationResponse(
        primary.entityId(), primary.revisionId(), primary.version(), documents);
  }
}
