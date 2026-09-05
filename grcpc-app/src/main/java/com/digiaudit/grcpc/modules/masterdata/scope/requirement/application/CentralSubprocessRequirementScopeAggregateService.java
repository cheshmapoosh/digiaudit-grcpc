package com.digiaudit.grcpc.modules.masterdata.scope.requirement.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.ForbiddenException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.common.security.CurrentUser;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationRequirementEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRequirementRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.api.dto.CentralRequirementScopeChangeOperation;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.api.dto.CentralRequirementScopeChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.api.dto.CentralSubprocessRequirementScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.api.mapper.CentralSubprocessRequirementScopeMapper;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.entity.CentralSubprocessRequirementScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.repository.CentralSubprocessRequirementScopeRepository;
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
public class CentralSubprocessRequirementScopeAggregateService {
  private static final RevisionEntityType ENTITY_TYPE =
      RevisionEntityType.CENTRAL_SUBPROCESS_REQUIREMENT_SCOPE;
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;

  private final CentralSubprocessRequirementScopeRepository scopes;
  private final CentralRegulationRequirementRepository requirements;
  private final CentralSubprocessRequirementScopeMapper mapper;
  private final MasterDataStructuralDependencyChecker dependencyChecker;
  private final CurrentUserProvider currentUserProvider;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public CentralSubprocessRequirementScopeAggregateService(
      CentralSubprocessRequirementScopeRepository scopes,
      CentralRegulationRequirementRepository requirements,
      CentralSubprocessRequirementScopeMapper mapper,
      MasterDataStructuralDependencyChecker dependencyChecker,
      CurrentUserProvider currentUserProvider,
      ObjectMapper objectMapper,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.scopes = scopes;
    this.requirements = requirements;
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
      List<CentralRequirementScopeChangeRequest> requestedChanges) {
    requireProcessGuard(context);
    SubprocessEndpoint endpoint = new SubprocessEndpoint(
        subprocess.getId(), requestedSubprocessStatus,
        requestedSubprocessValidFrom, requestedSubprocessValidTo);
    List<CentralRequirementScopeChangeRequest> changes =
        requestedChanges == null ? List.of() : List.copyOf(requestedChanges);
    if (changes.isEmpty()) return new PreparedChanges(endpoint.id(), List.of());

    List<UUID> requirementIds = collectUniqueRequirementIds(changes);
    changes = changes.stream()
        .sorted(Comparator.comparing(CentralRequirementScopeChangeRequest::requirementId))
        .toList();
    Map<UUID, CentralRegulationRequirementEntity> requirementsById = lockRequirements(requirementIds);
    Map<UUID, CentralSubprocessRequirementScopeEntity> scopesByRequirementId =
        lockScopes(subprocess.getId(), requirementIds);
    List<PreparedMutation> prepared = new ArrayList<>(changes.size());
    for (CentralRequirementScopeChangeRequest change : changes) {
      prepared.add(prepare(
          endpoint,
          requirementsById.get(change.requirementId()),
          scopesByRequirementId.get(change.requirementId()),
          change));
    }
    return new PreparedChanges(endpoint.id(), prepared);
  }

  public ApplyResult apply(PreparedChanges preparedChanges, CentralSubprocessEntity subprocess) {
    if (!preparedChanges.subprocessId().equals(subprocess.getId())) {
      throw new IllegalStateException("Prepared Requirement Scope changes belong to another Subprocess");
    }
    UUID actorId = currentUserProvider.getCurrentPrincipal().getUserId();
    Instant now = Instant.now(clock);
    for (PreparedMutation mutation : preparedChanges.mutations()) {
      applyMutation(mutation, subprocess.getId(), actorId, now);
    }
    scopes.saveAllAndFlush(preparedChanges.mutations().stream().map(PreparedMutation::scope).toList());
    List<RevisionContentResult> contents =
        preparedChanges.mutations().stream().map(this::revisionContent).toList();
    return new ApplyResult(contents, canonicalRows(subprocess));
  }

  public List<CentralSubprocessRequirementScopeResponse> canonicalRows(
      CentralSubprocessEntity subprocess) {
    List<CentralSubprocessRequirementScopeEntity> rows =
        scopes.findBySubprocessIdAndStatusNot(subprocess.getId(), DELETED);
    Map<UUID, CentralRegulationRequirementEntity> requirementsById = requirements.findAllById(
            rows.stream().map(CentralSubprocessRequirementScopeEntity::getRequirementId).toList())
        .stream().collect(java.util.stream.Collectors.toMap(
            CentralRegulationRequirementEntity::getId, value -> value));
    return rows.stream()
        .map(row -> mapper.toResponse(
            row, subprocess, requireRequirement(requirementsById, row.getRequirementId())))
        .sorted(Comparator.comparing(CentralSubprocessRequirementScopeResponse::requirementCode)
            .thenComparing(CentralSubprocessRequirementScopeResponse::id))
        .toList();
  }

  private PreparedMutation prepare(
      SubprocessEndpoint subprocess,
      CentralRegulationRequirementEntity requirement,
      CentralSubprocessRequirementScopeEntity existing,
      CentralRequirementScopeChangeRequest change) {
    if (requirement == null) throw endpointNotFound("Requirement", change.requirementId());
    validateScopeIdentity(change, existing);
    if (change.requestedStatus() == DELETED) {
      throw invalidChange("requestedStatus must not be DELETED");
    }
    ScopeFields fields = normalize(change);
    return switch (change.operation()) {
      case CREATE_OR_RESTORE -> prepareCreateOrRestore(subprocess, requirement, existing, fields);
      case UPDATE -> {
        CentralSubprocessRequirementScopeEntity scope = requireExisting(existing, change.requirementId());
        requireAuthority("CENTRAL_REQUIREMENT_SCOPE_UPDATE");
        requireNotDeleted(scope);
        long expectedVersion = requireAndAssertVersion(scope, change.version());
        validateValidityWithinEndpoints(fields, subprocess, requirement);
        MasterDataLifecycleStatus requestedStatus = normalizeUpdateStatus(change.requestedStatus(), scope);
        if (requestedStatus != scope.getStatus()) {
          requireAuthority("CENTRAL_REQUIREMENT_SCOPE_LIFECYCLE");
          RevisionOperationType lifecycle = requestedStatus == MasterDataLifecycleStatus.ACTIVE
              ? RevisionOperationType.ACTIVATE : RevisionOperationType.INACTIVATE;
          validateLifecycle(scope, lifecycle);
          if (lifecycle == RevisionOperationType.ACTIVATE) validateActiveEndpoints(subprocess, requirement);
        }
        yield new PreparedMutation(
            scope, RevisionOperationType.UPDATE, expectedVersion, snapshot(scope), fields, requestedStatus);
      }
      case ACTIVATE -> prepareLifecycle(subprocess, requirement, existing, change, RevisionOperationType.ACTIVATE);
      case INACTIVATE -> prepareLifecycle(subprocess, requirement, existing, change, RevisionOperationType.INACTIVATE);
      case DELETE -> prepareLifecycle(subprocess, requirement, existing, change, RevisionOperationType.DELETE);
    };
  }

  private PreparedMutation prepareCreateOrRestore(
      SubprocessEndpoint subprocess,
      CentralRegulationRequirementEntity requirement,
      CentralSubprocessRequirementScopeEntity existing,
      ScopeFields fields) {
    validateActiveEndpoints(subprocess, requirement);
    validateValidityWithinEndpoints(fields, subprocess, requirement);
    if (existing == null) {
      requireAuthority("CENTRAL_REQUIREMENT_SCOPE_CREATE");
      CentralSubprocessRequirementScopeEntity created = CentralSubprocessRequirementScopeEntity.create(
          UUID.randomUUID(), subprocess.id(), requirement.getId(), fields.validFrom(), fields.validTo(),
          currentUserProvider.getCurrentPrincipal().getUserId(), Instant.now(clock));
      return new PreparedMutation(
          created, RevisionOperationType.CREATE, null, null, fields, MasterDataLifecycleStatus.ACTIVE);
    }
    if (existing.getStatus() == MasterDataLifecycleStatus.ACTIVE) {
      throw duplicate(subprocess.id(), requirement.getId());
    }
    RevisionOperationType operation = existing.getStatus() == DELETED
        ? RevisionOperationType.RESTORE : RevisionOperationType.ACTIVATE;
    requireAuthority(operation == RevisionOperationType.RESTORE
        ? "CENTRAL_REQUIREMENT_SCOPE_RESTORE" : "CENTRAL_REQUIREMENT_SCOPE_LIFECYCLE");
    return new PreparedMutation(
        existing, operation, existing.getVersion(), snapshot(existing), fields, MasterDataLifecycleStatus.ACTIVE);
  }

  private PreparedMutation prepareLifecycle(
      SubprocessEndpoint subprocess,
      CentralRegulationRequirementEntity requirement,
      CentralSubprocessRequirementScopeEntity existing,
      CentralRequirementScopeChangeRequest change,
      RevisionOperationType operation) {
    CentralSubprocessRequirementScopeEntity scope = requireExisting(existing, change.requirementId());
    requireAuthority(operation == RevisionOperationType.DELETE
        ? "CENTRAL_REQUIREMENT_SCOPE_DELETE" : "CENTRAL_REQUIREMENT_SCOPE_LIFECYCLE");
    long expectedVersion = requireAndAssertVersion(scope, change.version());
    validateLifecycle(scope, operation);
    if (operation == RevisionOperationType.ACTIVATE) {
      validateActiveEndpoints(subprocess, requirement);
      validateValidityWithinEndpoints(currentFields(scope), subprocess, requirement);
    }
    if (operation == RevisionOperationType.DELETE
        && dependencyChecker.centralRequirementScopeHasLiveDependencies(scope.getId())) {
      throw new ConflictException(
          "REQUIREMENT_SCOPE_DEPENDENCY_CONFLICT",
          "error.masterdata.requirementScope.dependencyConflict",
          "Central Requirement Scope has live dependencies",
          scope.getId());
    }
    return new PreparedMutation(
        scope, operation, expectedVersion, snapshot(scope), currentFields(scope), scope.getStatus());
  }

  private void applyMutation(PreparedMutation mutation, UUID subprocessId, UUID actorId, Instant now) {
    CentralSubprocessRequirementScopeEntity scope = mutation.scope();
    ScopeFields fields = mutation.fields();
    switch (mutation.operation()) {
      case CREATE -> {
        if (!scope.getSubprocessId().equals(subprocessId)) {
          throw new IllegalStateException("Requirement Scope belongs to a different Subprocess");
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
      case RESTORE -> scope.restoreFromCreate(fields.validFrom(), fields.validTo(), actorId, now);
    }
    if (mutation.operation() == RevisionOperationType.UPDATE
        && mutation.requestedStatus() != scope.getStatus()) {
      if (mutation.requestedStatus() == MasterDataLifecycleStatus.ACTIVE) scope.activate(actorId, now);
      else scope.inactivate(actorId, now);
    }
  }

  private RevisionContentResult revisionContent(PreparedMutation mutation) {
    CentralSubprocessRequirementScopeEntity scope = mutation.scope();
    return RevisionContentResult.completed(
        ENTITY_TYPE, scope.getId(), mutation.operation(), mutation.expectedVersion(),
        mutation.before(), snapshot(scope), scope.getVersion(),
        objectMapper.valueToTree(Map.of(
            "validated", true,
            "hierarchyKey", MasterDataHierarchyKey.PROCESS.name(),
            "lockOrder", "PROCESS_GUARD_SUBPROCESS_CONTROLS_CONTROL_SCOPES_RISK_TEMPLATES_RISK_SCOPES_CONTROL_OBJECTIVES_CONTROL_OBJECTIVE_SCOPES_REQUIREMENTS_REQUIREMENT_SCOPES")));
  }

  private List<UUID> collectUniqueRequirementIds(List<CentralRequirementScopeChangeRequest> changes) {
    Set<UUID> seen = new HashSet<>();
    List<UUID> result = new ArrayList<>(changes.size());
    for (CentralRequirementScopeChangeRequest change : changes) {
      if (change == null || change.operation() == null || change.requirementId() == null) {
        throw invalidChange("Each Requirement Scope change requires operation and requirementId");
      }
      if (!seen.add(change.requirementId())) {
        throw invalidChange("Duplicate Requirement operation in one aggregate request");
      }
      result.add(change.requirementId());
    }
    result.sort(UUID::compareTo);
    return result;
  }

  private Map<UUID, CentralRegulationRequirementEntity> lockRequirements(List<UUID> ids) {
    Map<UUID, CentralRegulationRequirementEntity> result = new HashMap<>();
    for (CentralRegulationRequirementEntity requirement : requirements.lockAllByIds(ids)) {
      result.put(requirement.getId(), requirement);
    }
    for (UUID id : ids) if (!result.containsKey(id)) throw endpointNotFound("Requirement", id);
    return result;
  }

  private Map<UUID, CentralSubprocessRequirementScopeEntity> lockScopes(
      UUID subprocessId, List<UUID> requirementIds) {
    Map<UUID, CentralSubprocessRequirementScopeEntity> result = new HashMap<>();
    for (CentralSubprocessRequirementScopeEntity scope :
        scopes.lockByBusinessKeys(subprocessId, requirementIds)) {
      result.put(scope.getRequirementId(), scope);
    }
    return result;
  }

  private void validateScopeIdentity(
      CentralRequirementScopeChangeRequest change, CentralSubprocessRequirementScopeEntity existing) {
    if (change.operation() == CentralRequirementScopeChangeOperation.CREATE_OR_RESTORE) {
      if (change.scopeId() != null) throw invalidChange("CREATE_OR_RESTORE must not provide scopeId");
      return;
    }
    if (change.scopeId() == null || existing == null || !change.scopeId().equals(existing.getId())) {
      throw scopeNotFound(change.scopeId());
    }
  }

  private ScopeFields normalize(CentralRequirementScopeChangeRequest request) {
    ScopeFields fields = new ScopeFields(request.validFrom(), request.validTo());
    validateDateRange(fields.validFrom(), fields.validTo());
    return fields;
  }

  private void validateActiveEndpoints(
      SubprocessEndpoint subprocess, CentralRegulationRequirementEntity requirement) {
    if (subprocess.status() != MasterDataLifecycleStatus.ACTIVE) {
      throw invalidEndpointLifecycle("Subprocess", subprocess.id());
    }
    if (requirement.getStatus() != MasterDataLifecycleStatus.ACTIVE) {
      throw invalidEndpointLifecycle("Requirement", requirement.getId());
    }
  }

  private void validateValidityWithinEndpoints(
      ScopeFields fields,
      SubprocessEndpoint subprocess,
      CentralRegulationRequirementEntity requirement) {
    if (!isSubset(fields.validFrom(), fields.validTo(), subprocess.validFrom(), subprocess.validTo())
        || !isSubset(fields.validFrom(), fields.validTo(), requirement.getValidFrom(), requirement.getValidTo())) {
      throw new UnprocessableEntityException(
          "REQUIREMENT_SCOPE_VALIDITY_OUTSIDE_ENDPOINTS",
          "error.masterdata.requirementScope.validityOutsideEndpoints",
          "Requirement Scope validity must be within both endpoint intervals");
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
      CentralSubprocessRequirementScopeEntity scope, RevisionOperationType operation) {
    boolean valid = switch (operation) {
      case ACTIVATE -> scope.getStatus() == MasterDataLifecycleStatus.INACTIVE;
      case INACTIVATE -> scope.getStatus() == MasterDataLifecycleStatus.ACTIVE;
      case DELETE -> scope.getStatus() == MasterDataLifecycleStatus.ACTIVE
          || scope.getStatus() == MasterDataLifecycleStatus.INACTIVE;
      default -> false;
    };
    if (!valid) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_TRANSITION", "error.masterdata.v2.invalidLifecycleTransition",
          "Invalid Requirement Scope lifecycle transition", scope.getId());
    }
  }

  private MasterDataLifecycleStatus normalizeUpdateStatus(
      MasterDataLifecycleStatus requested, CentralSubprocessRequirementScopeEntity scope) {
    if (requested == null) return scope.getStatus();
    if (requested == DELETED) throw invalidChange("UPDATE requestedStatus must be ACTIVE or INACTIVE");
    return requested;
  }

  private long requireAndAssertVersion(
      CentralSubprocessRequirementScopeEntity scope, Long requestedVersion) {
    if (requestedVersion == null || requestedVersion < 0 || scope.getVersion() != requestedVersion) {
      throw new ConflictException(
          "VERSION_CONFLICT", "error.masterdata.v2.versionConflict",
          "The Requirement Scope has changed", scope.getId());
    }
    return requestedVersion;
  }

  private void requireNotDeleted(CentralSubprocessRequirementScopeEntity scope) {
    if (scope.getStatus() == DELETED) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_TRANSITION", "error.masterdata.v2.invalidLifecycleTransition",
          "Deleted Requirement Scope cannot be updated", scope.getId());
    }
  }

  private void requireAuthority(String authority) {
    CurrentUser user = currentUserProvider.getCurrentPrincipal();
    boolean allowed = user.isRootUser() || user.getAuthorities().stream().anyMatch(granted ->
        granted.getAuthority().equals("ROLE_ROOT_ADMIN") || granted.getAuthority().equals(authority));
    if (!allowed) {
      throw new ForbiddenException(
          "FORBIDDEN", "error.security.forbidden", "Missing required authority: " + authority, authority);
    }
  }

  private void requireProcessGuard(RevisionExecutionContext context) {
    if (context.acquiredHierarchyKey() != MasterDataHierarchyKey.PROCESS) {
      throw new IllegalStateException("Requirement Scope aggregate changes require the PROCESS hierarchy guard");
    }
  }

  private ScopeFields currentFields(CentralSubprocessRequirementScopeEntity scope) {
    return new ScopeFields(scope.getValidFrom(), scope.getValidTo());
  }

  private JsonNode snapshot(CentralSubprocessRequirementScopeEntity scope) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("id", scope.getId());
    values.put("subprocessId", scope.getSubprocessId());
    values.put("requirementId", scope.getRequirementId());
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

  private CentralSubprocessRequirementScopeEntity requireExisting(
      CentralSubprocessRequirementScopeEntity scope, UUID requirementId) {
    if (scope == null) throw scopeNotFound(requirementId);
    return scope;
  }

  private CentralRegulationRequirementEntity requireRequirement(
      Map<UUID, CentralRegulationRequirementEntity> values, UUID id) {
    CentralRegulationRequirementEntity value = values.get(id);
    if (value == null) throw endpointNotFound("Requirement", id);
    return value;
  }

  private ConflictException duplicate(UUID subprocessId, UUID requirementId) {
    return new ConflictException(
        "DUPLICATE_RELATION", "error.masterdata.requirementScope.duplicate",
        "The Requirement is already scoped to the Subprocess", subprocessId, requirementId);
  }

  private NotFoundException scopeNotFound(UUID id) {
    return new NotFoundException(
        "CENTRAL_REQUIREMENT_SCOPE_NOT_FOUND", "error.masterdata.requirementScope.notFound",
        "Central Requirement Scope not found", id);
  }

  private NotFoundException endpointNotFound(String type, UUID id) {
    return new NotFoundException(
        "REQUIREMENT_SCOPE_ENDPOINT_NOT_FOUND", "error.masterdata.requirementScope.endpointNotFound",
        type + " endpoint not found", id);
  }

  private UnprocessableEntityException invalidEndpointLifecycle(String type, UUID id) {
    return new UnprocessableEntityException(
        "REQUIREMENT_SCOPE_ENDPOINT_NOT_ACTIVE", "error.masterdata.requirementScope.endpointNotActive",
        type + " endpoint must be active", id);
  }

  private UnprocessableEntityException invalidChange(String message) {
    return new UnprocessableEntityException(
        "REQUIREMENT_SCOPE_CHANGE_INVALID", "error.masterdata.requirementScope.invalidChange", message);
  }

  private record ScopeFields(LocalDate validFrom, LocalDate validTo) {}
  private record PreparedMutation(
      CentralSubprocessRequirementScopeEntity scope,
      RevisionOperationType operation,
      Long expectedVersion,
      JsonNode before,
      ScopeFields fields,
      MasterDataLifecycleStatus requestedStatus) {}
  private record SubprocessEndpoint(
      UUID id, MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo) {}

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
      List<CentralSubprocessRequirementScopeResponse> canonicalRows) {
    public ApplyResult {
      revisionContents = List.copyOf(revisionContents);
      canonicalRows = List.copyOf(canonicalRows);
    }
  }
}
