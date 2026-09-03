package com.digiaudit.grcpc.modules.masterdata.scope.control.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.ForbiddenException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.common.security.CurrentUser;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlAutomationType;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlOperationFrequency;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlTestingTechnique;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.CentralControlScopeChangeOperation;
import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.CentralControlScopeChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.CentralSubprocessControlScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.control.api.mapper.CentralSubprocessControlScopeMapper;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.entity.CentralSubprocessControlScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.repository.CentralSubprocessControlScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataStructuralDependencyChecker;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class CentralSubprocessControlScopeAggregateService {
  private static final RevisionEntityType ENTITY_TYPE =
      RevisionEntityType.CENTRAL_SUBPROCESS_CONTROL_SCOPE;
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;

  private final CentralSubprocessControlScopeRepository scopes;
  private final CentralControlRepository controls;
  private final CentralSubprocessControlScopeMapper mapper;
  private final MasterDataStructuralDependencyChecker dependencyChecker;
  private final CurrentUserProvider currentUserProvider;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public CentralSubprocessControlScopeAggregateService(
      CentralSubprocessControlScopeRepository scopes,
      CentralControlRepository controls,
      CentralSubprocessControlScopeMapper mapper,
      MasterDataStructuralDependencyChecker dependencyChecker,
      CurrentUserProvider currentUserProvider,
      ObjectMapper objectMapper,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.scopes = scopes;
    this.controls = controls;
    this.mapper = mapper;
    this.dependencyChecker = dependencyChecker;
    this.currentUserProvider = currentUserProvider;
    this.objectMapper = objectMapper;
    this.clock = clock;
  }

  public PreparedChanges prepare(
      RevisionExecutionContext context,
      CentralSubprocessEntity subprocess,
      MasterDataLifecycleStatus requestedSubprocessStatus,
      LocalDate requestedSubprocessValidFrom,
      LocalDate requestedSubprocessValidTo,
      List<CentralControlScopeChangeRequest> requestedChanges) {
    requireProcessGuard(context);
    SubprocessEndpoint endpoint = new SubprocessEndpoint(
        subprocess.getId(), requestedSubprocessStatus,
        requestedSubprocessValidFrom, requestedSubprocessValidTo);
    List<CentralControlScopeChangeRequest> changes =
        requestedChanges == null ? List.of() : List.copyOf(requestedChanges);
    if (changes.isEmpty()) {
      return new PreparedChanges(endpoint.id(), List.of());
    }

    List<UUID> controlIds = collectUniqueControlIds(changes);
    changes = changes.stream()
        .sorted(Comparator.comparing(CentralControlScopeChangeRequest::controlId))
        .toList();
    Map<UUID, CentralControlEntity> controlsById = lockControls(controlIds);
    Map<UUID, CentralSubprocessControlScopeEntity> scopesByControlId =
        lockScopes(subprocess.getId(), controlIds);
    List<PreparedMutation> prepared = new ArrayList<>(changes.size());
    for (CentralControlScopeChangeRequest change : changes) {
      prepared.add(
          prepare(
              endpoint,
              controlsById.get(change.controlId()),
              scopesByControlId.get(change.controlId()),
              change));
    }

    return new PreparedChanges(endpoint.id(), prepared);
  }

  public ApplyResult apply(
      PreparedChanges preparedChanges,
      CentralSubprocessEntity subprocess) {
    if (!preparedChanges.subprocessId().equals(subprocess.getId())) {
      throw new IllegalStateException("Prepared Control Scope changes belong to another Subprocess");
    }
    List<PreparedMutation> prepared = preparedChanges.mutations();
    UUID actorId = currentUserProvider.getCurrentPrincipal().getUserId();
    Instant now = Instant.now(clock);
    for (PreparedMutation mutation : prepared) {
      applyMutation(mutation, subprocess.getId(), actorId, now);
    }
    scopes.saveAllAndFlush(prepared.stream().map(PreparedMutation::scope).toList());

    List<RevisionContentResult> contents = prepared.stream()
        .map(this::revisionContent)
        .toList();
    return new ApplyResult(contents, canonicalRows(subprocess));
  }

  public List<CentralSubprocessControlScopeResponse> canonicalRows(
      CentralSubprocessEntity subprocess) {
    List<CentralSubprocessControlScopeEntity> rows =
        scopes.findBySubprocessIdAndStatusNot(subprocess.getId(), DELETED);
    Map<UUID, CentralControlEntity> controlsById =
        controls.findAllById(rows.stream().map(CentralSubprocessControlScopeEntity::getControlId).toList())
            .stream()
            .collect(java.util.stream.Collectors.toMap(CentralControlEntity::getId, value -> value));
    return rows.stream()
        .map(row -> mapper.toResponse(row, subprocess, requireControl(controlsById, row.getControlId())))
        .sorted(Comparator.comparing(CentralSubprocessControlScopeResponse::controlCode)
            .thenComparing(CentralSubprocessControlScopeResponse::id))
        .toList();
  }

  public List<String> frequencyCodes() {
    return enumNames(CentralControlOperationFrequency.values());
  }

  public List<String> executionMethodCodes() {
    return enumNames(CentralControlAutomationType.values());
  }

  public List<String> testMethodCodes() {
    return enumNames(CentralControlTestingTechnique.values());
  }

  private PreparedMutation prepare(
      SubprocessEndpoint subprocess,
      CentralControlEntity control,
      CentralSubprocessControlScopeEntity existing,
      CentralControlScopeChangeRequest change) {
    if (control == null) {
      throw endpointNotFound("Control", change.controlId());
    }
    validateScopeIdentity(change, existing);
    ScopeFields fields = normalize(change);
    return switch (change.operation()) {
      case CREATE_OR_RESTORE -> prepareCreateOrRestore(subprocess, control, existing, fields);
      case UPDATE -> {
        CentralSubprocessControlScopeEntity scope = requireExisting(existing, change.controlId());
        requireAuthority("CENTRAL_CONTROL_SCOPE_UPDATE");
        requireNotDeleted(scope);
        long expectedVersion = requireAndAssertVersion(scope, change.version());
        validateValidityWithinEndpoints(fields, subprocess, control);
        MasterDataLifecycleStatus requestedStatus = normalizeUpdateStatus(change.requestedStatus(), scope);
        if (requestedStatus != scope.getStatus()) {
          requireAuthority("CENTRAL_CONTROL_SCOPE_LIFECYCLE");
          RevisionOperationType lifecycle = requestedStatus == MasterDataLifecycleStatus.ACTIVE
              ? RevisionOperationType.ACTIVATE : RevisionOperationType.INACTIVATE;
          validateLifecycle(scope, lifecycle);
          if (lifecycle == RevisionOperationType.ACTIVATE) validateActiveEndpoints(subprocess, control);
        }
        yield new PreparedMutation(scope, RevisionOperationType.UPDATE, expectedVersion, snapshot(scope), fields, requestedStatus);
      }
      case ACTIVATE -> prepareLifecycle(
          subprocess, control, existing, change, RevisionOperationType.ACTIVATE);
      case INACTIVATE -> prepareLifecycle(
          subprocess, control, existing, change, RevisionOperationType.INACTIVATE);
      case DELETE -> prepareLifecycle(
          subprocess, control, existing, change, RevisionOperationType.DELETE);
    };
  }

  private PreparedMutation prepareCreateOrRestore(
      SubprocessEndpoint subprocess,
      CentralControlEntity control,
      CentralSubprocessControlScopeEntity existing,
      ScopeFields fields) {
    validateActiveEndpoints(subprocess, control);
    validateValidityWithinEndpoints(fields, subprocess, control);
    if (existing == null) {
      requireAuthority("CENTRAL_CONTROL_SCOPE_CREATE");
      CentralSubprocessControlScopeEntity created = CentralSubprocessControlScopeEntity.create(
          UUID.randomUUID(), subprocess.id(), control.getId(), fields.frequency(),
          fields.executionMethod(), fields.testMethod(), fields.validFrom(), fields.validTo(),
          currentUserProvider.getCurrentPrincipal().getUserId(), Instant.now(clock));
      return new PreparedMutation(created, RevisionOperationType.CREATE, null, null, fields, MasterDataLifecycleStatus.ACTIVE);
    }
    if (existing.getStatus() == MasterDataLifecycleStatus.ACTIVE) {
      throw duplicate(subprocess.id(), control.getId());
    }
    RevisionOperationType operation = existing.getStatus() == DELETED
        ? RevisionOperationType.RESTORE
        : RevisionOperationType.ACTIVATE;
    requireAuthority(operation == RevisionOperationType.RESTORE
        ? "CENTRAL_CONTROL_SCOPE_RESTORE"
        : "CENTRAL_CONTROL_SCOPE_LIFECYCLE");
    return new PreparedMutation(existing, operation, existing.getVersion(), snapshot(existing), fields, MasterDataLifecycleStatus.ACTIVE);
  }

  private PreparedMutation prepareLifecycle(
      SubprocessEndpoint subprocess,
      CentralControlEntity control,
      CentralSubprocessControlScopeEntity existing,
      CentralControlScopeChangeRequest change,
      RevisionOperationType operation) {
    CentralSubprocessControlScopeEntity scope = requireExisting(existing, change.controlId());
    requireAuthority(operation == RevisionOperationType.DELETE
        ? "CENTRAL_CONTROL_SCOPE_DELETE"
        : "CENTRAL_CONTROL_SCOPE_LIFECYCLE");
    long expectedVersion = requireAndAssertVersion(scope, change.version());
    validateLifecycle(scope, operation);
    if (operation == RevisionOperationType.ACTIVATE) {
      validateActiveEndpoints(subprocess, control);
      validateValidityWithinEndpoints(currentFields(scope), subprocess, control);
    }
    if (operation == RevisionOperationType.DELETE
        && dependencyChecker.centralControlScopeHasLiveDependencies(scope.getId())) {
      throw new ConflictException(
          "CONTROL_SCOPE_DEPENDENCY_CONFLICT",
          "error.masterdata.controlScope.dependencyConflict",
          "Central Control Scope has live dependencies",
          scope.getId());
    }
    return new PreparedMutation(scope, operation, expectedVersion, snapshot(scope), currentFields(scope), scope.getStatus());
  }

  private void applyMutation(
      PreparedMutation mutation, UUID subprocessId, UUID actorId, Instant now) {
    CentralSubprocessControlScopeEntity scope = mutation.scope();
    ScopeFields fields = mutation.fields();
    switch (mutation.operation()) {
      case CREATE -> {
        if (!scope.getSubprocessId().equals(subprocessId)) {
          throw new IllegalStateException("Control Scope belongs to a different Subprocess");
        }
      }
      case UPDATE -> scope.update(
          fields.frequency(), fields.executionMethod(), fields.testMethod(),
          fields.validFrom(), fields.validTo(), actorId, now);
      case ACTIVATE -> {
        if (scope.getStatus() == MasterDataLifecycleStatus.INACTIVE) {
          scope.reactivateFromCreate(
              fields.frequency(), fields.executionMethod(), fields.testMethod(),
              fields.validFrom(), fields.validTo(), actorId, now);
        } else {
          scope.activate(actorId, now);
        }
      }
      case INACTIVATE -> scope.inactivate(actorId, now);
      case DELETE -> scope.delete(actorId, now);
      case RESTORE -> scope.restoreFromCreate(
          fields.frequency(), fields.executionMethod(), fields.testMethod(),
          fields.validFrom(), fields.validTo(), actorId, now);
    }
    if (mutation.operation() == RevisionOperationType.UPDATE
        && mutation.requestedStatus() != scope.getStatus()) {
      if (mutation.requestedStatus() == MasterDataLifecycleStatus.ACTIVE) scope.activate(actorId, now);
      else scope.inactivate(actorId, now);
    }
  }

  private RevisionContentResult revisionContent(PreparedMutation mutation) {
    CentralSubprocessControlScopeEntity scope = mutation.scope();
    return RevisionContentResult.completed(
        ENTITY_TYPE,
        scope.getId(),
        mutation.operation(),
        mutation.expectedVersion(),
        mutation.before(),
        snapshot(scope),
        scope.getVersion(),
        objectMapper.valueToTree(Map.of(
            "validated", true,
            "hierarchyKey", MasterDataHierarchyKey.PROCESS.name(),
            "lockOrder", "PROCESS_GUARD_SUBPROCESS_CONTROLS_SCOPES")));
  }

  private List<UUID> collectUniqueControlIds(List<CentralControlScopeChangeRequest> changes) {
    Set<UUID> seen = new HashSet<>();
    List<UUID> result = new ArrayList<>(changes.size());
    for (CentralControlScopeChangeRequest change : changes) {
      if (change == null || change.operation() == null || change.controlId() == null) {
        throw invalidChange("Each Control Scope change requires operation and controlId");
      }
      if (!seen.add(change.controlId())) {
        throw invalidChange("Duplicate Control operation in one aggregate request");
      }
      result.add(change.controlId());
    }
    result.sort(UUID::compareTo);
    return result;
  }

  private Map<UUID, CentralControlEntity> lockControls(List<UUID> controlIds) {
    Map<UUID, CentralControlEntity> result = new HashMap<>();
    for (CentralControlEntity control : controls.lockAllByIds(controlIds)) {
      result.put(control.getId(), control);
    }
    for (UUID controlId : controlIds) {
      if (!result.containsKey(controlId)) throw endpointNotFound("Control", controlId);
    }
    return result;
  }

  private Map<UUID, CentralSubprocessControlScopeEntity> lockScopes(
      UUID subprocessId, List<UUID> controlIds) {
    Map<UUID, CentralSubprocessControlScopeEntity> result = new HashMap<>();
    for (CentralSubprocessControlScopeEntity scope :
        scopes.lockByBusinessKeys(subprocessId, controlIds)) {
      result.put(scope.getControlId(), scope);
    }
    return result;
  }

  private void validateScopeIdentity(
      CentralControlScopeChangeRequest change,
      CentralSubprocessControlScopeEntity existing) {
    if (change.operation() == CentralControlScopeChangeOperation.CREATE_OR_RESTORE) {
      if (change.scopeId() != null) throw invalidChange("CREATE_OR_RESTORE must not provide scopeId");
      return;
    }
    if (change.scopeId() == null || existing == null || !change.scopeId().equals(existing.getId())) {
      throw scopeNotFound(change.scopeId());
    }
  }

  private ScopeFields normalize(CentralControlScopeChangeRequest request) {
    ScopeFields fields = new ScopeFields(
        normalizeCatalogCode(request.recommendedFrequencyCode(), CentralControlOperationFrequency.class,
            "recommendedFrequencyCode"),
        normalizeCatalogCode(request.recommendedExecutionMethodCode(), CentralControlAutomationType.class,
            "recommendedExecutionMethodCode"),
        normalizeCatalogCode(request.recommendedTestMethodCode(), CentralControlTestingTechnique.class,
            "recommendedTestMethodCode"),
        request.validFrom(),
        request.validTo());
    validateDateRange(fields.validFrom(), fields.validTo());
    return fields;
  }

  private <E extends Enum<E>> String normalizeCatalogCode(
      String value, Class<E> enumType, String field) {
    if (value == null || value.isBlank()) return null;
    String normalized = value.trim().toUpperCase(java.util.Locale.ROOT);
    if (normalized.getBytes(StandardCharsets.UTF_8).length > 64) {
      throw invalidCatalogCode(field, normalized);
    }
    try {
      Enum.valueOf(enumType, normalized);
      return normalized;
    } catch (IllegalArgumentException exception) {
      throw invalidCatalogCode(field, normalized);
    }
  }

  private void validateActiveEndpoints(
      SubprocessEndpoint subprocess, CentralControlEntity control) {
    if (subprocess.status() != MasterDataLifecycleStatus.ACTIVE) {
      throw invalidEndpointLifecycle("Subprocess", subprocess.id());
    }
    if (control.getStatus() != MasterDataLifecycleStatus.ACTIVE) {
      throw invalidEndpointLifecycle("Control", control.getId());
    }
  }

  private void validateValidityWithinEndpoints(
      ScopeFields fields,
      SubprocessEndpoint subprocess,
      CentralControlEntity control) {
    if (!isSubset(fields.validFrom(), fields.validTo(), subprocess.validFrom(), subprocess.validTo())
        || !isSubset(fields.validFrom(), fields.validTo(), control.getValidFrom(), control.getValidTo())) {
      throw new UnprocessableEntityException(
          "CONTROL_SCOPE_VALIDITY_OUTSIDE_ENDPOINTS",
          "error.masterdata.controlScope.validityOutsideEndpoints",
          "Control Scope validity must be within both endpoint intervals");
    }
  }

  private boolean isSubset(
      LocalDate childFrom, LocalDate childTo, LocalDate parentFrom, LocalDate parentTo) {
    boolean lower = parentFrom == null || (childFrom != null && !childFrom.isBefore(parentFrom));
    boolean upper = parentTo == null || (childTo != null && !childTo.isAfter(parentTo));
    return lower && upper;
  }

  private void validateDateRange(LocalDate validFrom, LocalDate validTo) {
    if (validFrom != null && validTo != null && validTo.isBefore(validFrom)) {
      throw new UnprocessableEntityException(
          "DATE_RANGE_INVALID", "error.masterdata.v2.invalidValidityRange", "Validity range is invalid");
    }
  }

  private void validateLifecycle(
      CentralSubprocessControlScopeEntity scope, RevisionOperationType operation) {
    boolean valid = switch (operation) {
      case ACTIVATE -> scope.getStatus() == MasterDataLifecycleStatus.INACTIVE;
      case INACTIVATE -> scope.getStatus() == MasterDataLifecycleStatus.ACTIVE;
      case DELETE -> scope.getStatus() == MasterDataLifecycleStatus.ACTIVE
          || scope.getStatus() == MasterDataLifecycleStatus.INACTIVE;
      default -> false;
    };
    if (!valid) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_TRANSITION",
          "error.masterdata.v2.invalidLifecycleTransition",
          "Invalid Control Scope lifecycle transition",
          scope.getId());
    }
  }

  private MasterDataLifecycleStatus normalizeUpdateStatus(
      MasterDataLifecycleStatus requested, CentralSubprocessControlScopeEntity scope) {
    if (requested == null) return scope.getStatus();
    if (requested == DELETED) {
      throw invalidChange("UPDATE requestedStatus must be ACTIVE or INACTIVE");
    }
    return requested;
  }

  private long requireAndAssertVersion(
      CentralSubprocessControlScopeEntity scope, Long requestedVersion) {
    if (requestedVersion == null || requestedVersion < 0 || scope.getVersion() != requestedVersion) {
      throw new ConflictException(
          "VERSION_CONFLICT", "error.masterdata.v2.versionConflict",
          "The Control Scope has changed", scope.getId());
    }
    return requestedVersion;
  }

  private void requireNotDeleted(CentralSubprocessControlScopeEntity scope) {
    if (scope.getStatus() == DELETED) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_TRANSITION",
          "error.masterdata.v2.invalidLifecycleTransition",
          "Deleted Control Scope cannot be updated",
          scope.getId());
    }
  }

  private void requireAuthority(String authority) {
    CurrentUser user = currentUserProvider.getCurrentPrincipal();
    boolean allowed = user.isRootUser() || user.getAuthorities().stream()
        .anyMatch(granted -> granted.getAuthority().equals("ROLE_ROOT_ADMIN")
            || granted.getAuthority().equals(authority));
    if (!allowed) {
      throw new ForbiddenException(
          "FORBIDDEN", "error.security.forbidden", "Missing required authority: " + authority, authority);
    }
  }

  private void requireProcessGuard(RevisionExecutionContext context) {
    if (context.acquiredHierarchyKey() != MasterDataHierarchyKey.PROCESS) {
      throw new IllegalStateException("Control Scope aggregate changes require the PROCESS hierarchy guard");
    }
  }

  private ScopeFields currentFields(CentralSubprocessControlScopeEntity scope) {
    return new ScopeFields(
        scope.getRecommendedFrequencyCode(), scope.getRecommendedExecutionMethodCode(),
        scope.getRecommendedTestMethodCode(), scope.getValidFrom(), scope.getValidTo());
  }

  private JsonNode snapshot(CentralSubprocessControlScopeEntity scope) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("id", scope.getId());
    values.put("subprocessId", scope.getSubprocessId());
    values.put("controlId", scope.getControlId());
    values.put("recommendedFrequencyCode", scope.getRecommendedFrequencyCode());
    values.put("recommendedExecutionMethodCode", scope.getRecommendedExecutionMethodCode());
    values.put("recommendedTestMethodCode", scope.getRecommendedTestMethodCode());
    values.put("status", scope.getStatus().wireValue());
    values.put("validFrom", scope.getValidFrom());
    values.put("validTo", scope.getValidTo());
    values.put("version", scope.getVersion());
    values.put("createdAt", scope.getCreatedAt());
    values.put("createdBy", scope.getCreatedBy());
    values.put("updatedAt", scope.getUpdatedAt());
    values.put("updatedBy", scope.getUpdatedBy());
    values.put("deletedAt", scope.getDeletedAt());
    values.put("deletedBy", scope.getDeletedBy());
    return objectMapper.valueToTree(values);
  }

  private <E extends Enum<E>> List<String> enumNames(E[] values) {
    return Arrays.stream(values).map(Enum::name).toList();
  }

  private CentralSubprocessControlScopeEntity requireExisting(
      CentralSubprocessControlScopeEntity scope, UUID controlId) {
    if (scope == null) throw scopeNotFound(controlId);
    return scope;
  }

  private CentralControlEntity requireControl(Map<UUID, CentralControlEntity> values, UUID id) {
    CentralControlEntity value = values.get(id);
    if (value == null) throw endpointNotFound("Control", id);
    return value;
  }

  private ConflictException duplicate(UUID subprocessId, UUID controlId) {
    return new ConflictException(
        "DUPLICATE_RELATION", "error.masterdata.controlScope.duplicate",
        "The Control is already scoped to the Subprocess", subprocessId, controlId);
  }

  private NotFoundException scopeNotFound(UUID id) {
    return new NotFoundException(
        "CENTRAL_CONTROL_SCOPE_NOT_FOUND", "error.masterdata.controlScope.notFound",
        "Central Control Scope not found", id);
  }

  private NotFoundException endpointNotFound(String type, UUID id) {
    return new NotFoundException(
        "CONTROL_SCOPE_ENDPOINT_NOT_FOUND", "error.masterdata.controlScope.endpointNotFound",
        type + " endpoint not found", id);
  }

  private UnprocessableEntityException invalidEndpointLifecycle(String type, UUID id) {
    return new UnprocessableEntityException(
        "CONTROL_SCOPE_ENDPOINT_NOT_ACTIVE", "error.masterdata.controlScope.endpointNotActive",
        type + " endpoint must be active", id);
  }

  private UnprocessableEntityException invalidCatalogCode(String field, String value) {
    return new UnprocessableEntityException(
        "CONTROL_SCOPE_CATALOG_CODE_INVALID", "error.masterdata.controlScope.invalidCatalogCode",
        "Unsupported Control Scope catalog code", field, value);
  }

  private UnprocessableEntityException invalidChange(String message) {
    return new UnprocessableEntityException(
        "CONTROL_SCOPE_CHANGE_INVALID", "error.masterdata.controlScope.invalidChange", message);
  }

  private record ScopeFields(
      String frequency,
      String executionMethod,
      String testMethod,
      LocalDate validFrom,
      LocalDate validTo) {}

  private record PreparedMutation(
      CentralSubprocessControlScopeEntity scope,
      RevisionOperationType operation,
      Long expectedVersion,
      JsonNode before,
      ScopeFields fields,
      MasterDataLifecycleStatus requestedStatus) {}

  private record SubprocessEndpoint(
      UUID id,
      MasterDataLifecycleStatus status,
      LocalDate validFrom,
      LocalDate validTo) {}

  public static final class PreparedChanges {
    private final UUID subprocessId;
    private final List<PreparedMutation> mutations;

    private PreparedChanges(UUID subprocessId, List<PreparedMutation> mutations) {
      this.subprocessId = subprocessId;
      this.mutations = List.copyOf(mutations);
    }

    private UUID subprocessId() { return subprocessId; }
    private List<PreparedMutation> mutations() { return mutations; }
  }

  public record ApplyResult(
      List<RevisionContentResult> revisionContents,
      List<CentralSubprocessControlScopeResponse> canonicalRows) {
    public ApplyResult {
      revisionContents = List.copyOf(revisionContents);
      canonicalRows = List.copyOf(canonicalRows);
    }
  }
}
