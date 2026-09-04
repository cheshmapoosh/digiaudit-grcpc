package com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.ForbiddenException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.common.security.CurrentUser;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.repository.CentralControlObjectiveRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.dto.CentralControlObjectiveScopeChangeOperation;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.dto.CentralControlObjectiveScopeChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.dto.CentralSubprocessControlObjectiveScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.mapper.CentralSubprocessControlObjectiveScopeMapper;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.entity.CentralSubprocessControlObjectiveScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.repository.CentralSubprocessControlObjectiveScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataStructuralDependencyChecker;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class CentralSubprocessControlObjectiveScopeAggregateService {
  private static final RevisionEntityType ENTITY_TYPE =
      RevisionEntityType.CENTRAL_SUBPROCESS_CONTROL_OBJECTIVE_SCOPE;
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;

  private final CentralSubprocessControlObjectiveScopeRepository scopes;
  private final CentralControlObjectiveRepository controlObjectives;
  private final CentralSubprocessControlObjectiveScopeMapper mapper;
  private final MasterDataStructuralDependencyChecker dependencyChecker;
  private final CurrentUserProvider currentUserProvider;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public CentralSubprocessControlObjectiveScopeAggregateService(
      CentralSubprocessControlObjectiveScopeRepository scopes,
      CentralControlObjectiveRepository controlObjectives,
      CentralSubprocessControlObjectiveScopeMapper mapper,
      MasterDataStructuralDependencyChecker dependencyChecker,
      CurrentUserProvider currentUserProvider,
      ObjectMapper objectMapper,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.scopes = scopes;
    this.controlObjectives = controlObjectives;
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
      List<CentralControlObjectiveScopeChangeRequest> requestedChanges) {
    requireProcessGuard(context);
    SubprocessEndpoint endpoint =
        new SubprocessEndpoint(
            subprocess.getId(),
            requestedSubprocessStatus,
            requestedSubprocessValidFrom,
            requestedSubprocessValidTo);
    List<CentralControlObjectiveScopeChangeRequest> changes =
        requestedChanges == null ? List.of() : List.copyOf(requestedChanges);
    if (changes.isEmpty()) {
      return new PreparedChanges(endpoint.id(), List.of());
    }

    List<UUID> controlObjectiveIds = collectUniqueControlObjectiveIds(changes);
    changes =
        changes.stream()
            .sorted(Comparator.comparing(CentralControlObjectiveScopeChangeRequest::controlObjectiveId))
            .toList();
    Map<UUID, CentralControlObjectiveEntity> controlObjectivesById = lockControlObjectives(controlObjectiveIds);
    Map<UUID, CentralSubprocessControlObjectiveScopeEntity> scopesByControlObjectiveId =
        lockScopes(subprocess.getId(), controlObjectiveIds);
    List<PreparedMutation> prepared = new ArrayList<>(changes.size());
    for (CentralControlObjectiveScopeChangeRequest change : changes) {
      prepared.add(
          prepare(
              endpoint,
              controlObjectivesById.get(change.controlObjectiveId()),
              scopesByControlObjectiveId.get(change.controlObjectiveId()),
              change));
    }
    return new PreparedChanges(endpoint.id(), prepared);
  }

  public ApplyResult apply(PreparedChanges preparedChanges, CentralSubprocessEntity subprocess) {
    if (!preparedChanges.subprocessId().equals(subprocess.getId())) {
      throw new IllegalStateException("Prepared Control Objective Scope changes belong to another Subprocess");
    }
    List<PreparedMutation> prepared = preparedChanges.mutations();
    UUID actorId = currentUserProvider.getCurrentPrincipal().getUserId();
    Instant now = Instant.now(clock);
    for (PreparedMutation mutation : prepared) {
      applyMutation(mutation, subprocess.getId(), actorId, now);
    }
    scopes.saveAllAndFlush(prepared.stream().map(PreparedMutation::scope).toList());
    List<RevisionContentResult> contents = prepared.stream().map(this::revisionContent).toList();
    return new ApplyResult(contents, canonicalRows(subprocess));
  }

  public List<CentralSubprocessControlObjectiveScopeResponse> canonicalRows(
      CentralSubprocessEntity subprocess) {
    List<CentralSubprocessControlObjectiveScopeEntity> rows =
        scopes.findBySubprocessIdAndStatusNot(subprocess.getId(), DELETED);
    Map<UUID, CentralControlObjectiveEntity> controlObjectivesById =
        controlObjectives.findAllById(
                rows.stream().map(CentralSubprocessControlObjectiveScopeEntity::getControlObjectiveId).toList())
            .stream()
            .collect(
                java.util.stream.Collectors.toMap(
                    CentralControlObjectiveEntity::getId, value -> value));
    return rows.stream()
        .map(
            row ->
                mapper.toResponse(
                    row,
                    subprocess,
                    requireControlObjective(controlObjectivesById, row.getControlObjectiveId())))
        .sorted(
            Comparator.comparing(CentralSubprocessControlObjectiveScopeResponse::controlObjectiveCode)
                .thenComparing(CentralSubprocessControlObjectiveScopeResponse::id))
        .toList();
  }

  private PreparedMutation prepare(
      SubprocessEndpoint subprocess,
      CentralControlObjectiveEntity controlObjective,
      CentralSubprocessControlObjectiveScopeEntity existing,
      CentralControlObjectiveScopeChangeRequest change) {
    if (controlObjective == null) {
      throw endpointNotFound("Control Objective", change.controlObjectiveId());
    }
    validateScopeIdentity(change, existing);
    ScopeFields fields = normalize(change);
    return switch (change.operation()) {
      case CREATE_OR_RESTORE ->
          prepareCreateOrRestore(subprocess, controlObjective, existing, fields);
      case UPDATE -> {
        CentralSubprocessControlObjectiveScopeEntity scope =
            requireExisting(existing, change.controlObjectiveId());
        requireAuthority("CENTRAL_CONTROL_OBJECTIVE_SCOPE_UPDATE");
        requireNotDeleted(scope);
        long expectedVersion = requireAndAssertVersion(scope, change.version());
        validateValidityWithinEndpoints(fields, subprocess, controlObjective);
        MasterDataLifecycleStatus requestedStatus =
            normalizeUpdateStatus(change.requestedStatus(), scope);
        if (requestedStatus != scope.getStatus()) {
          requireAuthority("CENTRAL_CONTROL_OBJECTIVE_SCOPE_LIFECYCLE");
          RevisionOperationType lifecycle =
              requestedStatus == MasterDataLifecycleStatus.ACTIVE
                  ? RevisionOperationType.ACTIVATE
                  : RevisionOperationType.INACTIVATE;
          validateLifecycle(scope, lifecycle);
          if (lifecycle == RevisionOperationType.ACTIVATE) {
            validateActiveEndpoints(subprocess, controlObjective);
          }
        }
        yield new PreparedMutation(
            scope,
            RevisionOperationType.UPDATE,
            expectedVersion,
            snapshot(scope),
            fields,
            requestedStatus);
      }
      case ACTIVATE ->
          prepareLifecycle(
              subprocess, controlObjective, existing, change, RevisionOperationType.ACTIVATE);
      case INACTIVATE ->
          prepareLifecycle(
              subprocess, controlObjective, existing, change, RevisionOperationType.INACTIVATE);
      case DELETE ->
          prepareLifecycle(
              subprocess, controlObjective, existing, change, RevisionOperationType.DELETE);
    };
  }

  private PreparedMutation prepareCreateOrRestore(
      SubprocessEndpoint subprocess,
      CentralControlObjectiveEntity controlObjective,
      CentralSubprocessControlObjectiveScopeEntity existing,
      ScopeFields fields) {
    validateActiveEndpoints(subprocess, controlObjective);
    validateValidityWithinEndpoints(fields, subprocess, controlObjective);
    if (existing == null) {
      requireAuthority("CENTRAL_CONTROL_OBJECTIVE_SCOPE_CREATE");
      CentralSubprocessControlObjectiveScopeEntity created =
          CentralSubprocessControlObjectiveScopeEntity.create(
              UUID.randomUUID(),
              subprocess.id(),
              controlObjective.getId(),
              fields.validFrom(),
              fields.validTo(),
              currentUserProvider.getCurrentPrincipal().getUserId(),
              Instant.now(clock));
      return new PreparedMutation(
          created,
          RevisionOperationType.CREATE,
          null,
          null,
          fields,
          MasterDataLifecycleStatus.ACTIVE);
    }
    if (existing.getStatus() == MasterDataLifecycleStatus.ACTIVE) {
      throw duplicate(subprocess.id(), controlObjective.getId());
    }
    RevisionOperationType operation =
        existing.getStatus() == DELETED
            ? RevisionOperationType.RESTORE
            : RevisionOperationType.ACTIVATE;
    requireAuthority(
        operation == RevisionOperationType.RESTORE
            ? "CENTRAL_CONTROL_OBJECTIVE_SCOPE_RESTORE"
            : "CENTRAL_CONTROL_OBJECTIVE_SCOPE_LIFECYCLE");
    return new PreparedMutation(
        existing,
        operation,
        existing.getVersion(),
        snapshot(existing),
        fields,
        MasterDataLifecycleStatus.ACTIVE);
  }

  private PreparedMutation prepareLifecycle(
      SubprocessEndpoint subprocess,
      CentralControlObjectiveEntity controlObjective,
      CentralSubprocessControlObjectiveScopeEntity existing,
      CentralControlObjectiveScopeChangeRequest change,
      RevisionOperationType operation) {
    CentralSubprocessControlObjectiveScopeEntity scope =
        requireExisting(existing, change.controlObjectiveId());
    requireAuthority(
        operation == RevisionOperationType.DELETE
            ? "CENTRAL_CONTROL_OBJECTIVE_SCOPE_DELETE"
            : "CENTRAL_CONTROL_OBJECTIVE_SCOPE_LIFECYCLE");
    long expectedVersion = requireAndAssertVersion(scope, change.version());
    validateLifecycle(scope, operation);
    if (operation == RevisionOperationType.ACTIVATE) {
      validateActiveEndpoints(subprocess, controlObjective);
      validateValidityWithinEndpoints(currentFields(scope), subprocess, controlObjective);
    }
    if (operation == RevisionOperationType.DELETE
        && dependencyChecker.centralControlObjectiveScopeHasLiveDependencies(scope.getId())) {
      throw new ConflictException(
          "CONTROL_OBJECTIVE_SCOPE_DEPENDENCY_CONFLICT",
          "error.masterdata.controlObjectiveScope.dependencyConflict",
          "Central Control Objective Scope has live dependencies",
          scope.getId());
    }
    return new PreparedMutation(
        scope,
        operation,
        expectedVersion,
        snapshot(scope),
        currentFields(scope),
        scope.getStatus());
  }

  private void applyMutation(
      PreparedMutation mutation, UUID subprocessId, UUID actorId, Instant now) {
    CentralSubprocessControlObjectiveScopeEntity scope = mutation.scope();
    ScopeFields fields = mutation.fields();
    switch (mutation.operation()) {
      case CREATE -> {
        if (!scope.getSubprocessId().equals(subprocessId)) {
          throw new IllegalStateException("Control Objective Scope belongs to a different Subprocess");
        }
      }
      case UPDATE -> scope.update(fields.validFrom(), fields.validTo(), actorId, now);
      case ACTIVATE -> {
        if (scope.getStatus() == MasterDataLifecycleStatus.INACTIVE) {
          scope.reactivateFromCreate(fields.validFrom(), fields.validTo(), actorId, now);
        } else {
          scope.activate(actorId, now);
        }
      }
      case INACTIVATE -> scope.inactivate(actorId, now);
      case DELETE -> scope.delete(actorId, now);
      case RESTORE ->
          scope.restoreFromCreate(fields.validFrom(), fields.validTo(), actorId, now);
    }
    if (mutation.operation() == RevisionOperationType.UPDATE
        && mutation.requestedStatus() != scope.getStatus()) {
      if (mutation.requestedStatus() == MasterDataLifecycleStatus.ACTIVE) {
        scope.activate(actorId, now);
      } else {
        scope.inactivate(actorId, now);
      }
    }
  }

  private RevisionContentResult revisionContent(PreparedMutation mutation) {
    CentralSubprocessControlObjectiveScopeEntity scope = mutation.scope();
    return RevisionContentResult.completed(
        ENTITY_TYPE,
        scope.getId(),
        mutation.operation(),
        mutation.expectedVersion(),
        mutation.before(),
        snapshot(scope),
        scope.getVersion(),
        objectMapper.valueToTree(
            Map.of(
                "validated",
                true,
                "hierarchyKey",
                MasterDataHierarchyKey.PROCESS.name(),
                "lockOrder",
                "PROCESS_GUARD_SUBPROCESS_CONTROLS_CONTROL_SCOPES_CONTROL_OBJECTIVES_CONTROL_OBJECTIVE_SCOPES")));
  }

  private List<UUID> collectUniqueControlObjectiveIds(
      List<CentralControlObjectiveScopeChangeRequest> changes) {
    Set<UUID> seen = new HashSet<>();
    List<UUID> result = new ArrayList<>(changes.size());
    for (CentralControlObjectiveScopeChangeRequest change : changes) {
      if (change == null || change.operation() == null || change.controlObjectiveId() == null) {
        throw invalidChange("Each Control Objective Scope change requires operation and controlObjectiveId");
      }
      if (!seen.add(change.controlObjectiveId())) {
        throw invalidChange("Duplicate Control Objective operation in one aggregate request");
      }
      result.add(change.controlObjectiveId());
    }
    result.sort(UUID::compareTo);
    return result;
  }

  private Map<UUID, CentralControlObjectiveEntity> lockControlObjectives(List<UUID> ids) {
    Map<UUID, CentralControlObjectiveEntity> result = new HashMap<>();
    for (CentralControlObjectiveEntity controlObjective : controlObjectives.lockAllByIds(ids)) {
      result.put(controlObjective.getId(), controlObjective);
    }
    for (UUID id : ids) {
      if (!result.containsKey(id)) throw endpointNotFound("Control Objective", id);
    }
    return result;
  }

  private Map<UUID, CentralSubprocessControlObjectiveScopeEntity> lockScopes(
      UUID subprocessId, List<UUID> controlObjectiveIds) {
    Map<UUID, CentralSubprocessControlObjectiveScopeEntity> result = new HashMap<>();
    for (CentralSubprocessControlObjectiveScopeEntity scope :
        scopes.lockByBusinessKeys(subprocessId, controlObjectiveIds)) {
      result.put(scope.getControlObjectiveId(), scope);
    }
    return result;
  }

  private void validateScopeIdentity(
      CentralControlObjectiveScopeChangeRequest change, CentralSubprocessControlObjectiveScopeEntity existing) {
    if (change.operation() == CentralControlObjectiveScopeChangeOperation.CREATE_OR_RESTORE) {
      if (change.scopeId() != null) {
        throw invalidChange("CREATE_OR_RESTORE must not provide scopeId");
      }
      return;
    }
    if (change.scopeId() == null
        || existing == null
        || !change.scopeId().equals(existing.getId())) {
      throw scopeNotFound(change.scopeId());
    }
  }

  private ScopeFields normalize(CentralControlObjectiveScopeChangeRequest request) {
    ScopeFields fields = new ScopeFields(request.validFrom(), request.validTo());
    validateDateRange(fields.validFrom(), fields.validTo());
    return fields;
  }

  private void validateActiveEndpoints(
      SubprocessEndpoint subprocess, CentralControlObjectiveEntity controlObjective) {
    if (subprocess.status() != MasterDataLifecycleStatus.ACTIVE) {
      throw invalidEndpointLifecycle("Subprocess", subprocess.id());
    }
    if (controlObjective.getStatus() != MasterDataLifecycleStatus.ACTIVE) {
      throw invalidEndpointLifecycle("Control Objective", controlObjective.getId());
    }
  }

  private void validateValidityWithinEndpoints(
      ScopeFields fields,
      SubprocessEndpoint subprocess,
      CentralControlObjectiveEntity controlObjective) {
    if (!isSubset(
            fields.validFrom(),
            fields.validTo(),
            subprocess.validFrom(),
            subprocess.validTo())
        || !isSubset(
            fields.validFrom(),
            fields.validTo(),
            controlObjective.getValidFrom(),
            controlObjective.getValidTo())) {
      throw new UnprocessableEntityException(
          "CONTROL_OBJECTIVE_SCOPE_VALIDITY_OUTSIDE_ENDPOINTS",
          "error.masterdata.controlObjectiveScope.validityOutsideEndpoints",
          "Control Objective Scope validity must be within both endpoint intervals");
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
          "DATE_RANGE_INVALID",
          "error.masterdata.v2.invalidValidityRange",
          "Validity range is invalid");
    }
  }

  private void validateLifecycle(
      CentralSubprocessControlObjectiveScopeEntity scope, RevisionOperationType operation) {
    boolean valid =
        switch (operation) {
          case ACTIVATE -> scope.getStatus() == MasterDataLifecycleStatus.INACTIVE;
          case INACTIVATE -> scope.getStatus() == MasterDataLifecycleStatus.ACTIVE;
          case DELETE ->
              scope.getStatus() == MasterDataLifecycleStatus.ACTIVE
                  || scope.getStatus() == MasterDataLifecycleStatus.INACTIVE;
          default -> false;
        };
    if (!valid) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_TRANSITION",
          "error.masterdata.v2.invalidLifecycleTransition",
          "Invalid Control Objective Scope lifecycle transition",
          scope.getId());
    }
  }

  private MasterDataLifecycleStatus normalizeUpdateStatus(
      MasterDataLifecycleStatus requested, CentralSubprocessControlObjectiveScopeEntity scope) {
    if (requested == null) return scope.getStatus();
    if (requested == DELETED) {
      throw invalidChange("UPDATE requestedStatus must be ACTIVE or INACTIVE");
    }
    return requested;
  }

  private long requireAndAssertVersion(
      CentralSubprocessControlObjectiveScopeEntity scope, Long requestedVersion) {
    if (requestedVersion == null
        || requestedVersion < 0
        || scope.getVersion() != requestedVersion) {
      throw new ConflictException(
          "VERSION_CONFLICT",
          "error.masterdata.v2.versionConflict",
          "The Control Objective Scope has changed",
          scope.getId());
    }
    return requestedVersion;
  }

  private void requireNotDeleted(CentralSubprocessControlObjectiveScopeEntity scope) {
    if (scope.getStatus() == DELETED) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_TRANSITION",
          "error.masterdata.v2.invalidLifecycleTransition",
          "Deleted Control Objective Scope cannot be updated",
          scope.getId());
    }
  }

  private void requireAuthority(String authority) {
    CurrentUser user = currentUserProvider.getCurrentPrincipal();
    boolean allowed =
        user.isRootUser()
            || user.getAuthorities().stream()
                .anyMatch(
                    granted ->
                        granted.getAuthority().equals("ROLE_ROOT_ADMIN")
                            || granted.getAuthority().equals(authority));
    if (!allowed) {
      throw new ForbiddenException(
          "FORBIDDEN",
          "error.security.forbidden",
          "Missing required authority: " + authority,
          authority);
    }
  }

  private void requireProcessGuard(RevisionExecutionContext context) {
    if (context.acquiredHierarchyKey() != MasterDataHierarchyKey.PROCESS) {
      throw new IllegalStateException(
          "Control Objective Scope aggregate changes require the PROCESS hierarchy guard");
    }
  }

  private ScopeFields currentFields(CentralSubprocessControlObjectiveScopeEntity scope) {
    return new ScopeFields(scope.getValidFrom(), scope.getValidTo());
  }

  private JsonNode snapshot(CentralSubprocessControlObjectiveScopeEntity scope) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("id", scope.getId());
    values.put("subprocessId", scope.getSubprocessId());
    values.put("controlObjectiveId", scope.getControlObjectiveId());
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

  private CentralSubprocessControlObjectiveScopeEntity requireExisting(
      CentralSubprocessControlObjectiveScopeEntity scope, UUID controlObjectiveId) {
    if (scope == null) throw scopeNotFound(controlObjectiveId);
    return scope;
  }

  private CentralControlObjectiveEntity requireControlObjective(
      Map<UUID, CentralControlObjectiveEntity> values, UUID id) {
    CentralControlObjectiveEntity value = values.get(id);
    if (value == null) throw endpointNotFound("Control Objective", id);
    return value;
  }

  private ConflictException duplicate(UUID subprocessId, UUID controlObjectiveId) {
    return new ConflictException(
        "DUPLICATE_RELATION",
        "error.masterdata.controlObjectiveScope.duplicate",
        "The Control Objective is already scoped to the Subprocess",
        subprocessId,
        controlObjectiveId);
  }

  private NotFoundException scopeNotFound(UUID id) {
    return new NotFoundException(
        "CENTRAL_CONTROL_OBJECTIVE_SCOPE_NOT_FOUND",
        "error.masterdata.controlObjectiveScope.notFound",
        "Central Control Objective Scope not found",
        id);
  }

  private NotFoundException endpointNotFound(String type, UUID id) {
    return new NotFoundException(
        "CONTROL_OBJECTIVE_SCOPE_ENDPOINT_NOT_FOUND",
        "error.masterdata.controlObjectiveScope.endpointNotFound",
        type + " endpoint not found",
        id);
  }

  private UnprocessableEntityException invalidEndpointLifecycle(String type, UUID id) {
    return new UnprocessableEntityException(
        "CONTROL_OBJECTIVE_SCOPE_ENDPOINT_NOT_ACTIVE",
        "error.masterdata.controlObjectiveScope.endpointNotActive",
        type + " endpoint must be active",
        id);
  }

  private UnprocessableEntityException invalidChange(String message) {
    return new UnprocessableEntityException(
        "CONTROL_OBJECTIVE_SCOPE_CHANGE_INVALID", "error.masterdata.controlObjectiveScope.invalidChange", message);
  }

  private record ScopeFields(LocalDate validFrom, LocalDate validTo) {}

  private record PreparedMutation(
      CentralSubprocessControlObjectiveScopeEntity scope,
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
      List<CentralSubprocessControlObjectiveScopeResponse> canonicalRows) {
    public ApplyResult {
      revisionContents = List.copyOf(revisionContents);
      canonicalRows = List.copyOf(canonicalRows);
    }
  }
}
