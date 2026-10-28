package com.digiaudit.grcpc.modules.masterdata.objective.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.objective.api.OrganizationObjectiveDtos;
import com.digiaudit.grcpc.modules.masterdata.objective.api.OrganizationObjectiveChange;
import com.digiaudit.grcpc.modules.datasetprofile.application.ProfileTransactionPolicy;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.*;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

@Service
public class OrganizationObjectiveService {
  private final OrganizationObjectiveRepository assignments;
  private final OrganizationRepository organizations;
  private final ObjectiveRepository objectives;
  private final MasterDataRevisionCoordinator revisions;
  private final MasterDataRevisionActorProvider actors;
  private final RevisionMutationGuard mutationGuard;
  private final CatalogCommandSupport support;
  private final ObjectMapper objectMapper;
  private final Clock clock;
  private final MasterDataAuthorizationService authorization;

  public OrganizationObjectiveService(OrganizationObjectiveRepository assignments,
      OrganizationRepository organizations, ObjectiveRepository objectives,
      MasterDataRevisionCoordinator revisions, MasterDataRevisionActorProvider actors,
      RevisionMutationGuard mutationGuard, CatalogCommandSupport support,
      ObjectMapper objectMapper, @Qualifier("masterDataRevisionClock") Clock clock,
      MasterDataAuthorizationService authorization) {
    this.assignments = assignments;
    this.organizations = organizations;
    this.objectives = objectives;
    this.revisions = revisions;
    this.actors = actors;
    this.mutationGuard = mutationGuard;
    this.support = support;
    this.objectMapper = objectMapper;
    this.clock = clock;
    this.authorization = authorization;
  }

  @Transactional(readOnly = true)
  public List<OrganizationObjectiveDtos.Detail> list(UUID organizationId) {
    return list(organizationId, null);
  }

  @Transactional(readOnly = true)
  public List<OrganizationObjectiveDtos.Detail> list(UUID organizationId, MasterDataLifecycleStatus status) {
    requireOrganization(organizationId);
    return (status == MasterDataLifecycleStatus.DELETED
        ? assignments.findByOrganizationIdAndStatusOrderByNameAsc(organizationId, status)
        : assignments.findByOrganizationIdAndStatusNotOrderByNameAsc(
            organizationId, MasterDataLifecycleStatus.DELETED)).stream().map(this::detail).toList();
  }

  /** Internal aggregate reconciliation includes tombstones; ordinary reads remain non-DELETED. */
  @Transactional(readOnly = true)
  public List<OrganizationObjectiveDtos.Detail> canonicalForOrganization(UUID organizationId) {
    var rows = new java.util.ArrayList<>(list(organizationId));
    rows.addAll(list(organizationId, MasterDataLifecycleStatus.DELETED));
    return List.copyOf(rows);
  }

  @Transactional(readOnly = true)
  public List<OrganizationObjectiveDtos.OrganizationLink> canonicalForObjective(UUID objectiveId) {
    var rows = new java.util.ArrayList<>(listOrganizations(objectiveId));
    rows.addAll(listOrganizations(objectiveId, MasterDataLifecycleStatus.DELETED));
    return List.copyOf(rows);
  }

  @Transactional(readOnly = true)
  public List<OrganizationObjectiveDtos.OrganizationLink> listOrganizations(UUID objectiveId) {
    return listOrganizations(objectiveId, null);
  }

  @Transactional(readOnly = true)
  public List<OrganizationObjectiveDtos.OrganizationLink> listOrganizations(UUID objectiveId, MasterDataLifecycleStatus status) {
    var objective = objectives.findById(objectiveId).orElseThrow(() -> objectiveNotFound(objectiveId));
    if (objective.getStatus() == MasterDataLifecycleStatus.DELETED) throw objectiveNotFound(objectiveId);
    return (status == MasterDataLifecycleStatus.DELETED
        ? assignments.findByObjectiveIdAndStatusOrderByNameAsc(objectiveId, status)
        : assignments.findByObjectiveIdAndStatusNotOrderByNameAsc(
            objectiveId, MasterDataLifecycleStatus.DELETED)).stream()
        .map(assignment -> {
          var organization = organizations.findById(assignment.getOrganizationId()).orElse(null);
          if (organization == null || organization.getStatus() == MasterDataLifecycleStatus.DELETED)
            return null;
          return new OrganizationObjectiveDtos.OrganizationLink(assignment.getId(), organization.getId(),
              objectiveId, organization.getCode(), organization.getName(), assignment.getName(),
              assignment.getDescription(), assignment.getOwner(), assignment.getValidFrom(),
              assignment.getValidTo(), assignment.getStatus(), assignment.getVersion());
        }).filter(java.util.Objects::nonNull).toList();
  }

  public MasterDataRevisionMutationResponse assign(UUID organizationId,
      OrganizationObjectiveDtos.Create request) {
    support.validateValidity(request.validFrom(), request.validTo());
    RevisionExecutionResult result = revisions.executeStructural(
        List.of(MasterDataHierarchyKey.OBJECTIVE, MasterDataHierarchyKey.ORGANIZATION),
        RevisionRequest.local(organizationId, "Assign objective " + request.objectiveId(),
            "Organization objective assignment", null),
        context -> {
          requireGuards(context);
          requireOrganization(organizationId);
          ObjectiveEntity objective = requireObjective(request.objectiveId());
          requireAssignableObjective(objective);
          String name = normalizedName(request.name(), objective.getName());
          var existing = assignments.findByOrganizationIdAndObjectiveId(
              organizationId, objective.getId()).orElse(null);
          UUID actor = actors.currentActorId();
          Instant now = Instant.now(clock);
          OrganizationObjectiveEntity entity;
          RevisionOperationType operation;
          Long expected;
          JsonNode before;
          if (existing == null) {
            entity = new OrganizationObjectiveEntity(UUID.randomUUID(), organizationId,
                objective.getId(), name, support.normalizeDescription(request.description()),
                normalizeOwner(request.owner()), request.validFrom(), request.validTo(), actor, now);
            operation = RevisionOperationType.CREATE;
            expected = null;
            before = null;
          } else if (existing.getStatus() == MasterDataLifecycleStatus.DELETED) {
            entity = existing;
            expected = entity.getVersion();
            before = snapshot(entity);
            entity.restore(normalizedName(request.name(), entity.getName()),
                request.description() == null ? entity.getDescription() : support.normalizeDescription(request.description()),
                request.owner() == null ? entity.getOwner() : normalizeOwner(request.owner()),
                request.validFrom() == null ? entity.getValidFrom() : request.validFrom(),
                request.validTo() == null ? entity.getValidTo() : request.validTo(), actor, now);
            operation = RevisionOperationType.RESTORE;
          } else {
            throw new ConflictException("DUPLICATE_BUSINESS_KEY",
                "error.masterdata.v2.duplicateBusinessKey", "Objective already assigned",
                objective.getId());
          }
          entity = assignments.saveAndFlush(entity);
          return completed(context, entity, operation, expected, before);
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  public MasterDataRevisionMutationResponse update(UUID organizationId, UUID objectiveId,
      OrganizationObjectiveDtos.Update request) {
    long expected = support.requireVersion(request.version());
    support.validateValidity(request.validFrom(), request.validTo());
    RevisionExecutionResult result = revisions.executeStructural(
        List.of(MasterDataHierarchyKey.OBJECTIVE, MasterDataHierarchyKey.ORGANIZATION),
        RevisionRequest.local(organizationId, "Update objective assignment " + objectiveId,
            "Organization objective update", null),
        context -> {
          requireGuards(context);
          requireOrganization(organizationId);
          requireAssignableObjective(requireObjective(objectiveId));
          OrganizationObjectiveEntity entity = requireAssignment(organizationId, objectiveId);
          assertVersion(entity, expected);
          JsonNode before = snapshot(entity);
          entity.update(support.normalizeTitle(request.name()),
              support.normalizeDescription(request.description()), normalizeOwner(request.owner()),
              request.validFrom(), request.validTo(), actors.currentActorId(), Instant.now(clock));
          entity = assignments.saveAndFlush(entity);
          return completed(context, entity, RevisionOperationType.UPDATE, expected, before);
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  public MasterDataRevisionMutationResponse remove(UUID organizationId, UUID objectiveId,
      Long version) {
    long expected = support.requireVersion(version);
    RevisionExecutionResult result = revisions.executeStructural(
        List.of(MasterDataHierarchyKey.OBJECTIVE, MasterDataHierarchyKey.ORGANIZATION),
        RevisionRequest.local(organizationId, "Remove objective assignment " + objectiveId,
            "Organization objective removal", null),
        context -> {
          requireGuards(context);
          requireOrganization(organizationId);
          OrganizationObjectiveEntity entity = requireAssignment(organizationId, objectiveId);
          assertVersion(entity, expected);
          JsonNode before = snapshot(entity);
          entity.delete(actors.currentActorId(), Instant.now(clock));
          entity = assignments.saveAndFlush(entity);
          return completed(context, entity, RevisionOperationType.DELETE, expected, before);
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  public MasterDataRevisionMutationResponse activate(UUID organizationId, UUID objectiveId, Long version) {
    return lifecycle(organizationId, objectiveId, version, OrganizationObjectiveChange.Operation.ACTIVATE);
  }

  public MasterDataRevisionMutationResponse inactivate(UUID organizationId, UUID objectiveId, Long version) {
    return lifecycle(organizationId, objectiveId, version, OrganizationObjectiveChange.Operation.INACTIVATE);
  }

  private MasterDataRevisionMutationResponse lifecycle(UUID organizationId, UUID objectiveId, Long version,
      OrganizationObjectiveChange.Operation operation) {
    var result = revisions.executeStructural(List.of(MasterDataHierarchyKey.OBJECTIVE, MasterDataHierarchyKey.ORGANIZATION),
        RevisionRequest.local(organizationId, "Change objective assignment lifecycle", "Organization objective", null), context -> {
          requireGuards(context);
          var row = requireAssignment(organizationId, objectiveId);
          var plan = prepareForOrganization(organizationId, List.of(new OrganizationObjectiveChange(operation,
              row.getId(), version, objectiveId, null, null, null, null, null, null, null)), false);
          if (plan.isEmpty()) throw new UnprocessableEntityException("NO_CHANGE", "error.masterdata.v2.noChange", "No lifecycle change");
          var contents = apply(plan);
          var first = contents.getFirst();
          return RevisionOperationResult.completed(context, new MasterDataMutationResult(first.entityId(),
              context.revisionId(), first.appliedEntityVersion()), contents);
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  public record PlannedChange(UUID organizationId, UUID objectiveId,
      OrganizationObjectiveEntity row, RevisionOperationType operation, Long expected,
      JsonNode before, String name, String description, String owner,
      LocalDate validFrom, LocalDate validTo, MasterDataLifecycleStatus status) {}
  public record Plan(List<PlannedChange> changes) {
    public Plan { changes = List.copyOf(changes); }
    public boolean isEmpty() { return changes.isEmpty(); }
    public List<UUID> organizationIds() {
      return changes.stream().map(PlannedChange::organizationId).distinct()
          .sorted(java.util.Comparator.comparing(UUID::toString)).toList();
    }
    public Plan forOrganization(UUID id) {
      return new Plan(changes.stream().filter(c -> id.equals(c.organizationId())).toList());
    }
  }

  /** Prelocks B1 targets with the Organization aggregate's full endpoint union, before any relation locks. */
  @Transactional(propagation = Propagation.MANDATORY)
  public void lockOrganizationEndpoints(List<OrganizationObjectiveChange> changes) {
    ProfileTransactionPolicy.requireProtectedMutation();
    if (changes == null || changes.isEmpty()) return;
    requireAggregatePermission();
    var ids = new java.util.HashSet<UUID>();
    for (var change : changes) {
      if (change == null || change.objectiveId() == null || change.organizationId() != null
          || change.operation() == null || !ids.add(change.objectiveId())) throw invalidChange();
    }
    for (UUID id : ids.stream().sorted(java.util.Comparator.comparing(UUID::toString)).toList()) {
      objectives.lockById(id).orElseThrow(() -> objectiveNotFound(id));
    }
  }

  /** Called only after the owner's full lexical hierarchy-guard union has been acquired. */
  @Transactional(propagation = Propagation.MANDATORY)
  public Plan prepareForOrganization(UUID organizationId, List<OrganizationObjectiveChange> changes,
      boolean creating) {
    ProfileTransactionPolicy.requireProtectedMutation();
    if (changes == null || changes.isEmpty()) return new Plan(List.of());
    requireAggregatePermission();
    if (changes.stream().anyMatch(java.util.Objects::isNull)) throw invalidChange();
    if (!creating) {
      var organization = organizations.lockById(organizationId).orElseThrow(() -> assignmentNotFound(organizationId));
      if (organization.getStatus() == MasterDataLifecycleStatus.DELETED) throw assignmentNotFound(organizationId);
    }
    var sorted = changes.stream().sorted(java.util.Comparator.comparing(c ->
        c.objectiveId() == null ? "" : c.objectiveId().toString())).toList();
    java.util.Map<UUID, ObjectiveEntity> endpoints = new java.util.LinkedHashMap<>();
    for (var change : sorted) {
      if (change.objectiveId() == null || change.organizationId() != null) throw invalidChange();
      if (endpoints.containsKey(change.objectiveId())) throw invalidChange();
      endpoints.put(change.objectiveId(), objectives.lockById(change.objectiveId())
          .orElseThrow(() -> objectiveNotFound(change.objectiveId())));
    }
    var result = new java.util.ArrayList<PlannedChange>();
    for (var change : sorted) prepareOne(result, organizationId, endpoints.get(change.objectiveId()), change);
    return new Plan(result);
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public Plan prepareForObjective(ObjectiveEntity objective, List<OrganizationObjectiveChange> changes) {
    requireAggregatePermission();
    if (changes == null || changes.isEmpty()) return new Plan(List.of());
    if (changes.stream().anyMatch(java.util.Objects::isNull)) throw invalidChange();
    var sorted = changes.stream().sorted(java.util.Comparator.comparing(c ->
        c.organizationId() == null ? "" : c.organizationId().toString())).toList();
    var seen = new java.util.HashSet<UUID>();
    for (var change : sorted) {
      if (change.organizationId() == null || change.objectiveId() != null
          || !seen.add(change.organizationId())) throw invalidChange();
      var organization = organizations.lockById(change.organizationId())
          .orElseThrow(() -> assignmentNotFound(change.organizationId()));
      if (organization.getStatus() == MasterDataLifecycleStatus.DELETED) throw assignmentNotFound(change.organizationId());
    }
    // New Objective owners have no row yet. Existing owners are locked after Organizations,
    // and every endpoint lock is acquired before the first relationship-row lock.
    objectives.lockById(objective.getId());
    var result = new java.util.ArrayList<PlannedChange>();
    for (var change : sorted) prepareOne(result, change.organizationId(), objective, change);
    return new Plan(result);
  }

  private void prepareOne(List<PlannedChange> result, UUID organizationId, ObjectiveEntity objective,
      OrganizationObjectiveChange change) {
    if (change.operation() == null) throw invalidChange();
    var row = assignments.lockPair(organizationId, objective.getId()).orElse(null);
    var op = change.operation();
    if (op == OrganizationObjectiveChange.Operation.CREATE_OR_RESTORE) {
      if (change.requestedStatus() != null) throw invalidChange();
      if (row == null && (change.assignmentId() != null || change.version() != null)) throw invalidChange();
      if (row != null && row.getStatus() != MasterDataLifecycleStatus.DELETED) throw support.duplicate(objective.getCode());
      if (row != null) {
        if (!row.getId().equals(change.assignmentId())) throw assignmentNotFound(objective.getId());
        assertVersion(row, support.requireVersion(change.version()));
      }
    } else {
      if (row == null || !row.getId().equals(change.assignmentId())) throw assignmentNotFound(objective.getId());
      assertVersion(row, support.requireVersion(change.version()));
      if ((op == OrganizationObjectiveChange.Operation.RESTORE) != (row.getStatus() == MasterDataLifecycleStatus.DELETED))
        throw invalidChange();
    }
    boolean metadata = op == OrganizationObjectiveChange.Operation.CREATE_OR_RESTORE
        || op == OrganizationObjectiveChange.Operation.UPDATE;
    if (!metadata && (change.name() != null || change.description() != null || change.owner() != null
        || change.validFrom() != null || change.validTo() != null)) throw invalidChange();
    String name = metadata ? change.name() == null ? row == null ? objective.getName() : row.getName()
        : support.normalizeTitle(change.name()) : row.getName();
    String description = metadata ? support.normalizeDescription(change.description()) : row.getDescription();
    String owner = metadata ? normalizeOwner(change.owner()) : row.getOwner();
    LocalDate from = metadata ? change.validFrom() : row.getValidFrom();
    LocalDate to = metadata ? change.validTo() : row.getValidTo();
    // A restore without metadata retains the stored local fields and dates.
    if (op == OrganizationObjectiveChange.Operation.CREATE_OR_RESTORE && row != null
        && change.name() == null && change.description() == null && change.owner() == null
        && change.validFrom() == null && change.validTo() == null) {
      description = row.getDescription(); owner = row.getOwner(); from = row.getValidFrom(); to = row.getValidTo();
    }
    support.validateValidity(from, to);
    MasterDataLifecycleStatus status = switch (op) {
      case CREATE_OR_RESTORE, RESTORE, ACTIVATE -> MasterDataLifecycleStatus.ACTIVE;
      case INACTIVATE -> MasterDataLifecycleStatus.INACTIVE;
      case DELETE -> MasterDataLifecycleStatus.DELETED;
      case UPDATE -> change.requestedStatus() == null ? row.getStatus() : change.requestedStatus();
    };
    if (op == OrganizationObjectiveChange.Operation.UPDATE && status == MasterDataLifecycleStatus.DELETED)
      throw invalidChange();
    if (op != OrganizationObjectiveChange.Operation.UPDATE && change.requestedStatus() != null) throw invalidChange();
    if (status == MasterDataLifecycleStatus.ACTIVE) {
      if (objective.getStatus() != MasterDataLifecycleStatus.ACTIVE) throw objectiveNotFound(objective.getId());
      requireAssignableObjective(objective);
    }
    boolean same = row != null && row.getStatus() == status && java.util.Objects.equals(name, row.getName())
        && java.util.Objects.equals(description, row.getDescription()) && java.util.Objects.equals(owner, row.getOwner())
        && java.util.Objects.equals(from, row.getValidFrom()) && java.util.Objects.equals(to, row.getValidTo());
    if (same) return;
    RevisionOperationType operation = row == null ? RevisionOperationType.CREATE
        : row.getStatus() == MasterDataLifecycleStatus.DELETED ? RevisionOperationType.RESTORE
        : op == OrganizationObjectiveChange.Operation.DELETE ? RevisionOperationType.DELETE
        : op == OrganizationObjectiveChange.Operation.ACTIVATE ? RevisionOperationType.ACTIVATE
        : op == OrganizationObjectiveChange.Operation.INACTIVATE ? RevisionOperationType.INACTIVATE
        : RevisionOperationType.UPDATE;
    result.add(new PlannedChange(organizationId, objective.getId(), row, operation,
        row == null ? null : row.getVersion(), row == null ? null : snapshot(row),
        name, description, owner, from, to, status));
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public List<RevisionContentResult> apply(Plan plan) {
    if (plan.isEmpty()) return List.of();
    requireAggregatePermission();
    var contents = new java.util.ArrayList<RevisionContentResult>();
    UUID actor = actors.currentActorId(); Instant now = Instant.now(clock);
    for (var change : plan.changes()) {
      var row = change.row();
      if (row == null) row = new OrganizationObjectiveEntity(UUID.randomUUID(), change.organizationId(),
          change.objectiveId(), change.name(), change.description(), change.owner(),
          change.validFrom(), change.validTo(), actor, now);
      else if (change.operation() == RevisionOperationType.RESTORE) row.restore(change.name(),
          change.description(), change.owner(), change.validFrom(), change.validTo(), actor, now);
      else {
        row.update(change.name(), change.description(), change.owner(), change.validFrom(), change.validTo(), actor, now);
        if (change.status() == MasterDataLifecycleStatus.DELETED) row.delete(actor, now);
        else if (change.status() == MasterDataLifecycleStatus.INACTIVE) row.inactivate(actor, now);
        else row.activate(actor, now);
      }
      row = assignments.saveAndFlush(row);
      contents.add(RevisionContentResult.completed(RevisionEntityType.ORGANIZATION_OBJECTIVE, row.getId(),
          change.operation(), change.expected(), change.before(), snapshot(row), row.getVersion(),
          objectMapper.valueToTree(java.util.Map.of("validated", true))));
    }
    return List.copyOf(contents);
  }

  private void requireAggregatePermission() {
    ProfileTransactionPolicy.requireProtectedMutation();
    if (!authorization.canManage("REFERENCE"))
      throw new org.springframework.security.access.AccessDeniedException("Organization objectives require REFERENCE manage");
  }

  private UnprocessableEntityException invalidChange() {
    return new UnprocessableEntityException("INVALID_ORGANIZATION_OBJECTIVE_CHANGE",
        "error.masterdata.objective.organizationSelection", "Invalid organization objective change");
  }

  private RevisionOperationResult completed(RevisionExecutionContext context,
      OrganizationObjectiveEntity entity, RevisionOperationType operation, Long expected,
      JsonNode before) {
    MasterDataMutationResult primary = new MasterDataMutationResult(
        entity.getId(), context.revisionId(), entity.getVersion());
    RevisionContentResult content = RevisionContentResult.completed(
        RevisionEntityType.ORGANIZATION_OBJECTIVE, entity.getId(), operation,
        expected, before, snapshot(entity), entity.getVersion(),
        objectMapper.valueToTree(java.util.Map.of("validated", true)));
    return RevisionOperationResult.completed(context, primary, List.of(content));
  }

  private JsonNode snapshot(OrganizationObjectiveEntity entity) {
    return objectMapper.valueToTree(detail(entity));
  }

  private OrganizationObjectiveDtos.Detail detail(OrganizationObjectiveEntity entity) {
    String code = objectives.findById(entity.getObjectiveId()).map(ObjectiveEntity::getCode).orElse("");
    return new OrganizationObjectiveDtos.Detail(entity.getId(), entity.getOrganizationId(),
        entity.getObjectiveId(), code, entity.getName(), entity.getDescription(),
        entity.getOwner(), entity.getValidFrom(), entity.getValidTo(), entity.getStatus(),
        entity.getVersion(), entity.getCreatedAt(), entity.getUpdatedAt());
  }

  private void requireGuards(RevisionExecutionContext context) {
    mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.OBJECTIVE);
    mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.ORGANIZATION);
  }

  private void requireOrganization(UUID id) {
    if (!organizations.existsByIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED))
      throw new NotFoundException("ORGANIZATION_NOT_FOUND", "error.masterdata.v2.notFound",
          "Organization not found", id);
  }

  private ObjectiveEntity requireObjective(UUID id) {
    ObjectiveEntity objective = objectives.findById(id).orElseThrow(() -> objectiveNotFound(id));
    if (objective.getStatus() != MasterDataLifecycleStatus.ACTIVE) throw objectiveNotFound(id);
    return objective;
  }

  private void requireAssignableObjective(ObjectiveEntity objective) {
    if (objective.getKind() != ObjectiveKind.OBJECTIVE) {
      throw new UnprocessableEntityException("STRATEGY_ORGANIZATION_ASSIGNMENT",
          "error.masterdata.objective.strategyAssignment", "Only objectives can be assigned to organizations");
    }
    ObjectiveEntity strategy = objective.getParentObjectiveId() == null ? null
        : objectives.findById(objective.getParentObjectiveId()).orElse(null);
    if (strategy == null || strategy.getKind() != ObjectiveKind.STRATEGY
        || strategy.getParentObjectiveId() != null
        || strategy.getStatus() == MasterDataLifecycleStatus.DELETED) {
      throw new UnprocessableEntityException("OBJECTIVE_STRATEGY_REQUIRED",
          "error.masterdata.objective.strategyRequired", "An objective requires one strategy");
    }
  }

  private OrganizationObjectiveEntity requireAssignment(UUID organizationId, UUID objectiveId) {
    OrganizationObjectiveEntity entity = assignments.findByOrganizationIdAndObjectiveId(
        organizationId, objectiveId).orElseThrow(() -> assignmentNotFound(objectiveId));
    if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) throw assignmentNotFound(objectiveId);
    return entity;
  }

  private void assertVersion(OrganizationObjectiveEntity entity, long expected) {
    if (entity.getVersion() != expected)
      throw new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict",
          "Organization objective has changed", entity.getId());
  }

  private String normalizedName(String value, String fallback) {
    return support.normalizeTitle(value == null || value.isBlank() ? fallback : value);
  }

  private String normalizeOwner(String value) {
    if (value == null || value.isBlank()) return null;
    String owner = value.trim();
    if (owner.length() > 255)
      throw new UnprocessableEntityException("INVALID_OWNER",
          "error.masterdata.objective.ownerLength", "Owner exceeds 255 characters");
    return owner;
  }

  private NotFoundException objectiveNotFound(UUID id) {
    return new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound",
        "Objective not found", id);
  }

  private NotFoundException assignmentNotFound(UUID id) {
    return new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound",
        "Organization objective not found", id);
  }
}
