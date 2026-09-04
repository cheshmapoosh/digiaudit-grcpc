package com.digiaudit.grcpc.modules.masterdata.scope.risk.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.ForbiddenException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.common.security.CurrentUser;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskTemplateEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.repository.CentralRiskTemplateRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.api.dto.CentralRiskScopeChangeOperation;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.api.dto.CentralRiskScopeChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.api.dto.CentralSubprocessRiskScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.api.mapper.CentralSubprocessRiskScopeMapper;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.domain.entity.CentralSubprocessRiskScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.domain.repository.CentralSubprocessRiskScopeRepository;
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
public class CentralSubprocessRiskScopeAggregateService {
  private static final RevisionEntityType ENTITY_TYPE =
      RevisionEntityType.CENTRAL_SUBPROCESS_RISK_SCOPE;
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;

  private final CentralSubprocessRiskScopeRepository scopes;
  private final CentralRiskTemplateRepository riskTemplates;
  private final CentralSubprocessRiskScopeMapper mapper;
  private final MasterDataStructuralDependencyChecker dependencyChecker;
  private final CurrentUserProvider currentUserProvider;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public CentralSubprocessRiskScopeAggregateService(
      CentralSubprocessRiskScopeRepository scopes,
      CentralRiskTemplateRepository riskTemplates,
      CentralSubprocessRiskScopeMapper mapper,
      MasterDataStructuralDependencyChecker dependencyChecker,
      CurrentUserProvider currentUserProvider,
      ObjectMapper objectMapper,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.scopes = scopes;
    this.riskTemplates = riskTemplates;
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
      List<CentralRiskScopeChangeRequest> requestedChanges) {
    requireProcessGuard(context);
    SubprocessEndpoint endpoint =
        new SubprocessEndpoint(
            subprocess.getId(),
            requestedSubprocessStatus,
            requestedSubprocessValidFrom,
            requestedSubprocessValidTo);
    List<CentralRiskScopeChangeRequest> changes =
        requestedChanges == null ? List.of() : List.copyOf(requestedChanges);
    if (changes.isEmpty()) {
      return new PreparedChanges(endpoint.id(), List.of());
    }

    List<UUID> riskTemplateIds = collectUniqueRiskTemplateIds(changes);
    changes =
        changes.stream()
            .sorted(Comparator.comparing(CentralRiskScopeChangeRequest::riskTemplateId))
            .toList();
    Map<UUID, CentralRiskTemplateEntity> riskTemplatesById = lockRiskTemplates(riskTemplateIds);
    Map<UUID, CentralSubprocessRiskScopeEntity> scopesByRiskTemplateId =
        lockScopes(subprocess.getId(), riskTemplateIds);
    List<PreparedMutation> prepared = new ArrayList<>(changes.size());
    for (CentralRiskScopeChangeRequest change : changes) {
      prepared.add(
          prepare(
              endpoint,
              riskTemplatesById.get(change.riskTemplateId()),
              scopesByRiskTemplateId.get(change.riskTemplateId()),
              change));
    }
    return new PreparedChanges(endpoint.id(), prepared);
  }

  public ApplyResult apply(PreparedChanges preparedChanges, CentralSubprocessEntity subprocess) {
    if (!preparedChanges.subprocessId().equals(subprocess.getId())) {
      throw new IllegalStateException("Prepared Risk Scope changes belong to another Subprocess");
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

  public List<CentralSubprocessRiskScopeResponse> canonicalRows(
      CentralSubprocessEntity subprocess) {
    List<CentralSubprocessRiskScopeEntity> rows =
        scopes.findBySubprocessIdAndStatusNot(subprocess.getId(), DELETED);
    Map<UUID, CentralRiskTemplateEntity> riskTemplatesById =
        riskTemplates.findAllById(
                rows.stream().map(CentralSubprocessRiskScopeEntity::getRiskTemplateId).toList())
            .stream()
            .collect(
                java.util.stream.Collectors.toMap(
                    CentralRiskTemplateEntity::getId, value -> value));
    return rows.stream()
        .map(
            row ->
                mapper.toResponse(
                    row,
                    subprocess,
                    requireRiskTemplate(riskTemplatesById, row.getRiskTemplateId())))
        .sorted(
            Comparator.comparing(CentralSubprocessRiskScopeResponse::riskTemplateCode)
                .thenComparing(CentralSubprocessRiskScopeResponse::id))
        .toList();
  }

  private PreparedMutation prepare(
      SubprocessEndpoint subprocess,
      CentralRiskTemplateEntity riskTemplate,
      CentralSubprocessRiskScopeEntity existing,
      CentralRiskScopeChangeRequest change) {
    if (riskTemplate == null) {
      throw endpointNotFound("Risk Template", change.riskTemplateId());
    }
    validateScopeIdentity(change, existing);
    ScopeFields fields = normalize(change);
    return switch (change.operation()) {
      case CREATE_OR_RESTORE ->
          prepareCreateOrRestore(subprocess, riskTemplate, existing, fields);
      case UPDATE -> {
        CentralSubprocessRiskScopeEntity scope =
            requireExisting(existing, change.riskTemplateId());
        requireAuthority("CENTRAL_RISK_SCOPE_UPDATE");
        requireNotDeleted(scope);
        long expectedVersion = requireAndAssertVersion(scope, change.version());
        validateValidityWithinEndpoints(fields, subprocess, riskTemplate);
        MasterDataLifecycleStatus requestedStatus =
            normalizeUpdateStatus(change.requestedStatus(), scope);
        if (requestedStatus != scope.getStatus()) {
          requireAuthority("CENTRAL_RISK_SCOPE_LIFECYCLE");
          RevisionOperationType lifecycle =
              requestedStatus == MasterDataLifecycleStatus.ACTIVE
                  ? RevisionOperationType.ACTIVATE
                  : RevisionOperationType.INACTIVATE;
          validateLifecycle(scope, lifecycle);
          if (lifecycle == RevisionOperationType.ACTIVATE) {
            validateActiveEndpoints(subprocess, riskTemplate);
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
              subprocess, riskTemplate, existing, change, RevisionOperationType.ACTIVATE);
      case INACTIVATE ->
          prepareLifecycle(
              subprocess, riskTemplate, existing, change, RevisionOperationType.INACTIVATE);
      case DELETE ->
          prepareLifecycle(
              subprocess, riskTemplate, existing, change, RevisionOperationType.DELETE);
    };
  }

  private PreparedMutation prepareCreateOrRestore(
      SubprocessEndpoint subprocess,
      CentralRiskTemplateEntity riskTemplate,
      CentralSubprocessRiskScopeEntity existing,
      ScopeFields fields) {
    validateActiveEndpoints(subprocess, riskTemplate);
    validateValidityWithinEndpoints(fields, subprocess, riskTemplate);
    if (existing == null) {
      requireAuthority("CENTRAL_RISK_SCOPE_CREATE");
      CentralSubprocessRiskScopeEntity created =
          CentralSubprocessRiskScopeEntity.create(
              UUID.randomUUID(),
              subprocess.id(),
              riskTemplate.getId(),
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
      throw duplicate(subprocess.id(), riskTemplate.getId());
    }
    RevisionOperationType operation =
        existing.getStatus() == DELETED
            ? RevisionOperationType.RESTORE
            : RevisionOperationType.ACTIVATE;
    requireAuthority(
        operation == RevisionOperationType.RESTORE
            ? "CENTRAL_RISK_SCOPE_RESTORE"
            : "CENTRAL_RISK_SCOPE_LIFECYCLE");
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
      CentralRiskTemplateEntity riskTemplate,
      CentralSubprocessRiskScopeEntity existing,
      CentralRiskScopeChangeRequest change,
      RevisionOperationType operation) {
    CentralSubprocessRiskScopeEntity scope =
        requireExisting(existing, change.riskTemplateId());
    requireAuthority(
        operation == RevisionOperationType.DELETE
            ? "CENTRAL_RISK_SCOPE_DELETE"
            : "CENTRAL_RISK_SCOPE_LIFECYCLE");
    long expectedVersion = requireAndAssertVersion(scope, change.version());
    validateLifecycle(scope, operation);
    if (operation == RevisionOperationType.ACTIVATE) {
      validateActiveEndpoints(subprocess, riskTemplate);
      validateValidityWithinEndpoints(currentFields(scope), subprocess, riskTemplate);
    }
    if (operation == RevisionOperationType.DELETE
        && dependencyChecker.centralRiskScopeHasLiveDependencies(scope.getId())) {
      throw new ConflictException(
          "RISK_SCOPE_DEPENDENCY_CONFLICT",
          "error.masterdata.riskScope.dependencyConflict",
          "Central Risk Scope has live dependencies",
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
    CentralSubprocessRiskScopeEntity scope = mutation.scope();
    ScopeFields fields = mutation.fields();
    switch (mutation.operation()) {
      case CREATE -> {
        if (!scope.getSubprocessId().equals(subprocessId)) {
          throw new IllegalStateException("Risk Scope belongs to a different Subprocess");
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
    CentralSubprocessRiskScopeEntity scope = mutation.scope();
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
                "PROCESS_GUARD_SUBPROCESS_CONTROLS_CONTROL_SCOPES_RISK_TEMPLATES_RISK_SCOPES")));
  }

  private List<UUID> collectUniqueRiskTemplateIds(
      List<CentralRiskScopeChangeRequest> changes) {
    Set<UUID> seen = new HashSet<>();
    List<UUID> result = new ArrayList<>(changes.size());
    for (CentralRiskScopeChangeRequest change : changes) {
      if (change == null || change.operation() == null || change.riskTemplateId() == null) {
        throw invalidChange("Each Risk Scope change requires operation and riskTemplateId");
      }
      if (!seen.add(change.riskTemplateId())) {
        throw invalidChange("Duplicate Risk Template operation in one aggregate request");
      }
      result.add(change.riskTemplateId());
    }
    result.sort(UUID::compareTo);
    return result;
  }

  private Map<UUID, CentralRiskTemplateEntity> lockRiskTemplates(List<UUID> ids) {
    Map<UUID, CentralRiskTemplateEntity> result = new HashMap<>();
    for (CentralRiskTemplateEntity riskTemplate : riskTemplates.lockAllByIds(ids)) {
      result.put(riskTemplate.getId(), riskTemplate);
    }
    for (UUID id : ids) {
      if (!result.containsKey(id)) throw endpointNotFound("Risk Template", id);
    }
    return result;
  }

  private Map<UUID, CentralSubprocessRiskScopeEntity> lockScopes(
      UUID subprocessId, List<UUID> riskTemplateIds) {
    Map<UUID, CentralSubprocessRiskScopeEntity> result = new HashMap<>();
    for (CentralSubprocessRiskScopeEntity scope :
        scopes.lockByBusinessKeys(subprocessId, riskTemplateIds)) {
      result.put(scope.getRiskTemplateId(), scope);
    }
    return result;
  }

  private void validateScopeIdentity(
      CentralRiskScopeChangeRequest change, CentralSubprocessRiskScopeEntity existing) {
    if (change.operation() == CentralRiskScopeChangeOperation.CREATE_OR_RESTORE) {
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

  private ScopeFields normalize(CentralRiskScopeChangeRequest request) {
    ScopeFields fields = new ScopeFields(request.validFrom(), request.validTo());
    validateDateRange(fields.validFrom(), fields.validTo());
    return fields;
  }

  private void validateActiveEndpoints(
      SubprocessEndpoint subprocess, CentralRiskTemplateEntity riskTemplate) {
    if (subprocess.status() != MasterDataLifecycleStatus.ACTIVE) {
      throw invalidEndpointLifecycle("Subprocess", subprocess.id());
    }
    if (riskTemplate.getStatus() != MasterDataLifecycleStatus.ACTIVE) {
      throw invalidEndpointLifecycle("Risk Template", riskTemplate.getId());
    }
  }

  private void validateValidityWithinEndpoints(
      ScopeFields fields,
      SubprocessEndpoint subprocess,
      CentralRiskTemplateEntity riskTemplate) {
    if (!isSubset(
            fields.validFrom(),
            fields.validTo(),
            subprocess.validFrom(),
            subprocess.validTo())
        || !isSubset(
            fields.validFrom(),
            fields.validTo(),
            riskTemplate.getValidFrom(),
            riskTemplate.getValidTo())) {
      throw new UnprocessableEntityException(
          "RISK_SCOPE_VALIDITY_OUTSIDE_ENDPOINTS",
          "error.masterdata.riskScope.validityOutsideEndpoints",
          "Risk Scope validity must be within both endpoint intervals");
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
      CentralSubprocessRiskScopeEntity scope, RevisionOperationType operation) {
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
          "Invalid Risk Scope lifecycle transition",
          scope.getId());
    }
  }

  private MasterDataLifecycleStatus normalizeUpdateStatus(
      MasterDataLifecycleStatus requested, CentralSubprocessRiskScopeEntity scope) {
    if (requested == null) return scope.getStatus();
    if (requested == DELETED) {
      throw invalidChange("UPDATE requestedStatus must be ACTIVE or INACTIVE");
    }
    return requested;
  }

  private long requireAndAssertVersion(
      CentralSubprocessRiskScopeEntity scope, Long requestedVersion) {
    if (requestedVersion == null
        || requestedVersion < 0
        || scope.getVersion() != requestedVersion) {
      throw new ConflictException(
          "VERSION_CONFLICT",
          "error.masterdata.v2.versionConflict",
          "The Risk Scope has changed",
          scope.getId());
    }
    return requestedVersion;
  }

  private void requireNotDeleted(CentralSubprocessRiskScopeEntity scope) {
    if (scope.getStatus() == DELETED) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_TRANSITION",
          "error.masterdata.v2.invalidLifecycleTransition",
          "Deleted Risk Scope cannot be updated",
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
          "Risk Scope aggregate changes require the PROCESS hierarchy guard");
    }
  }

  private ScopeFields currentFields(CentralSubprocessRiskScopeEntity scope) {
    return new ScopeFields(scope.getValidFrom(), scope.getValidTo());
  }

  private JsonNode snapshot(CentralSubprocessRiskScopeEntity scope) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("id", scope.getId());
    values.put("subprocessId", scope.getSubprocessId());
    values.put("riskTemplateId", scope.getRiskTemplateId());
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

  private CentralSubprocessRiskScopeEntity requireExisting(
      CentralSubprocessRiskScopeEntity scope, UUID riskTemplateId) {
    if (scope == null) throw scopeNotFound(riskTemplateId);
    return scope;
  }

  private CentralRiskTemplateEntity requireRiskTemplate(
      Map<UUID, CentralRiskTemplateEntity> values, UUID id) {
    CentralRiskTemplateEntity value = values.get(id);
    if (value == null) throw endpointNotFound("Risk Template", id);
    return value;
  }

  private ConflictException duplicate(UUID subprocessId, UUID riskTemplateId) {
    return new ConflictException(
        "DUPLICATE_RELATION",
        "error.masterdata.riskScope.duplicate",
        "The Risk Template is already scoped to the Subprocess",
        subprocessId,
        riskTemplateId);
  }

  private NotFoundException scopeNotFound(UUID id) {
    return new NotFoundException(
        "CENTRAL_RISK_SCOPE_NOT_FOUND",
        "error.masterdata.riskScope.notFound",
        "Central Risk Scope not found",
        id);
  }

  private NotFoundException endpointNotFound(String type, UUID id) {
    return new NotFoundException(
        "RISK_SCOPE_ENDPOINT_NOT_FOUND",
        "error.masterdata.riskScope.endpointNotFound",
        type + " endpoint not found",
        id);
  }

  private UnprocessableEntityException invalidEndpointLifecycle(String type, UUID id) {
    return new UnprocessableEntityException(
        "RISK_SCOPE_ENDPOINT_NOT_ACTIVE",
        "error.masterdata.riskScope.endpointNotActive",
        type + " endpoint must be active",
        id);
  }

  private UnprocessableEntityException invalidChange(String message) {
    return new UnprocessableEntityException(
        "RISK_SCOPE_CHANGE_INVALID", "error.masterdata.riskScope.invalidChange", message);
  }

  private record ScopeFields(LocalDate validFrom, LocalDate validTo) {}

  private record PreparedMutation(
      CentralSubprocessRiskScopeEntity scope,
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
      List<CentralSubprocessRiskScopeResponse> canonicalRows) {
    public ApplyResult {
      revisionContents = List.copyOf(revisionContents);
      canonicalRows = List.copyOf(canonicalRows);
    }
  }
}
