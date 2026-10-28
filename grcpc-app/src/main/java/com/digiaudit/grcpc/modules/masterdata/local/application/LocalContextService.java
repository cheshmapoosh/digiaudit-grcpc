package com.digiaudit.grcpc.modules.masterdata.local.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalContextDtos;
import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.LocalOrganizationSubprocessScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.local.domain.repository.*;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.*;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.*;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationRepository;
import com.digiaudit.grcpc.modules.masterdata.local.api.dto.OrganizationLocalDtos;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Comparator;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LocalContextService {
  private static final List<MasterDataHierarchyKey> KEYS = List.of(
      MasterDataHierarchyKey.ORGANIZATION, MasterDataHierarchyKey.PROCESS);
  private final LocalCommandRules rules;
  private final RevisionMutationGuard mutationGuard;
  private final MasterDataRevisionCoordinator revisions;
  private final LocalOrganizationSubprocessScopeRepository rows;
  private final LocalSubprocessControlScopeRepository controls;
  private final LocalSubprocessRiskScopeRepository risks;
  private final LocalSubprocessControlObjectiveScopeRepository objectives;
  private final LocalSubprocessRequirementScopeRepository requirements;
  private final LocalSubprocessRiskControlCoverageRepository riskControls;
  private final LocalSubprocessRiskControlObjectiveCoverageRepository riskObjectives;
  private final LocalSubprocessControlControlObjectiveCoverageRepository controlObjectives;
  private final LocalSubprocessRequirementControlCoverageRepository requirementControls;
  private final LocalPolicySubprocessScopeRepository policies;
  private final OrganizationRepository organizations;
  private final CentralSubprocessRepository subprocesses;
  private final CurrentUserProvider currentUser;
  private final ObjectMapper mapper;
  private final Clock clock;

  public LocalContextService(LocalCommandRules rules, RevisionMutationGuard mutationGuard,
      MasterDataRevisionCoordinator revisions, LocalOrganizationSubprocessScopeRepository rows,
      LocalSubprocessControlScopeRepository controls, LocalSubprocessRiskScopeRepository risks,
      LocalSubprocessControlObjectiveScopeRepository objectives,
      LocalSubprocessRequirementScopeRepository requirements,
      LocalSubprocessRiskControlCoverageRepository riskControls,
      LocalSubprocessRiskControlObjectiveCoverageRepository riskObjectives,
      LocalSubprocessControlControlObjectiveCoverageRepository controlObjectives,
      LocalSubprocessRequirementControlCoverageRepository requirementControls,
      LocalPolicySubprocessScopeRepository policies, OrganizationRepository organizations,
      CentralSubprocessRepository subprocesses, CurrentUserProvider currentUser,
      ObjectMapper mapper, @Qualifier("masterDataRevisionClock") Clock clock) {
    this.rules = rules;
    this.mutationGuard = mutationGuard;
    this.revisions = revisions;
    this.rows = rows;
    this.controls = controls;
    this.risks = risks;
    this.objectives = objectives;
    this.requirements = requirements;
    this.riskControls = riskControls;
    this.riskObjectives = riskObjectives;
    this.controlObjectives = controlObjectives;
    this.requirementControls = requirementControls;
    this.policies = policies;
    this.organizations = organizations;
    this.subprocesses = subprocesses;
    this.currentUser = currentUser;
    this.mapper = mapper;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public LocalContextDtos.Page list(UUID organizationId, UUID subprocessId,
      MasterDataLifecycleStatus status, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS");
    var pageable = rules.pageable(page, size, sort, direction);
    if (!organizations.existsById(organizationId)) throw rules.referenceNotFound(organizationId);
    var statuses = rules.statuses(status);
    var result = subprocessId == null
        ? rows.findByOrganizationIdAndStatusIn(organizationId, statuses, pageable)
        : rows.findByOrganizationIdAndSubprocessIdAndStatusIn(organizationId, subprocessId,
            statuses, pageable);
    return new LocalContextDtos.Page(result.getContent().stream().map(this::map).toList(),
        page, size, result.getTotalElements(), result.getTotalPages());
  }

  @Transactional(readOnly = true)
  public LocalContextDtos.Row detail(UUID id, UUID expectedOrganizationId) {
    rules.requireView("PROCESS");
    var row = rows.findById(id).orElseThrow(() -> rules.notFound(id));
    rules.assertOwner(expectedOrganizationId, row.getOrganizationId());
    return map(row);
  }

  @Transactional
  public LocalContextDtos.Mutation create(LocalContextDtos.Create request) {
    rules.requireWrite("PROCESS");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    UUID orgId = request.organizationId();
    AtomicReference<LocalContextDtos.Row> response = new AtomicReference<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(orgId, "Create Local Context", "Organization Subprocess Context", null),
        revision -> {
          requireRevision(revision, orgId);
          var org = organizations.lockById(orgId)
              .orElseThrow(() -> rules.referenceNotFound(orgId));
          var subprocess = subprocesses.lockById(request.subprocessId())
              .orElseThrow(() -> rules.referenceNotFound(request.subprocessId()));
          rules.active(org.getStatus());
          rules.active(subprocess.getStatus());
          rules.dates(request.validFrom(), request.validTo());
          String note = rules.note(request.contextNote());
          rows.findByOrganizationIdAndSubprocessId(orgId, request.subprocessId())
              .ifPresent(other -> { throw rules.duplicate(other.getStatus()); });
          var row = rows.saveAndFlush(LocalOrganizationSubprocessScopeEntity.create(
              orgId, request.subprocessId(), note, request.validFrom(), request.validTo(),
              actor(), now()));
          response.set(map(row));
          return result(revision, row, RevisionOperationType.CREATE, null, null);
        });
    return mutation(result, response.get());
  }

  @Transactional
  public LocalContextDtos.Mutation update(UUID id, UUID expectedOrganizationId,
      LocalContextDtos.Update request) {
    return change(id, expectedOrganizationId, request.version(), "update", request);
  }

  /** The Organization's multi-select creates explicit Local Contexts, never Central scopes. */
  @Transactional
  public LocalContextDtos.Selection selectSubprocesses(UUID organizationId,
      LocalContextDtos.SelectSubprocesses request) {
    rules.requireWrite("PROCESS");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    var selected = request.subprocessIds();
    if (selected == null || selected.isEmpty() || selected.stream().anyMatch(id -> id == null)
        || new HashSet<>(selected).size() != selected.size()) {
      throw rules.bad("Select distinct Subprocesses");
    }
    var ids = selected.stream().sorted(Comparator.comparing(UUID::toString)).toList();
    List<LocalContextDtos.Row> confirmed = new ArrayList<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(organizationId, "Select Organization Subprocesses", "Create explicit Local Contexts", null),
        revision -> {
          requireRevision(revision, organizationId);
          var organization = organizations.lockById(organizationId)
              .orElseThrow(() -> rules.referenceNotFound(organizationId));
          rules.active(organization.getStatus());
          // Lock and validate the complete selection before writing its first context.
          for (UUID id : ids) {
            var subprocess = subprocesses.lockById(id).orElseThrow(() -> rules.referenceNotFound(id));
            rules.active(subprocess.getStatus());
            rows.findByOrganizationIdAndSubprocessId(organizationId, id)
                .ifPresent(other -> { throw rules.duplicate(other.getStatus()); });
          }
          List<RevisionContentResult> contents = new ArrayList<>();
          MasterDataMutationResult primary = null;
          for (UUID id : ids) {
            var row = rows.saveAndFlush(LocalOrganizationSubprocessScopeEntity.create(
                organizationId, id, null, null, null, actor(), now()));
            confirmed.add(map(row));
            contents.add(RevisionContentResult.completed(RevisionEntityType.LOCAL_ORGANIZATION_SUBPROCESS_SCOPE,
                row.getId(), RevisionOperationType.CREATE, null, null, snapshot(row), row.getVersion(),
                mapper.valueToTree(Map.of("validated", true))));
            if (primary == null) primary = new MasterDataMutationResult(row.getId(), revision.revisionId(), row.getVersion());
          }
          return RevisionOperationResult.completed(revision, primary, contents);
        });
    return new LocalContextDtos.Selection(result.primaryResult().revisionId(), List.copyOf(confirmed));
  }

  @Transactional
  public LocalContextDtos.Version lifecycle(UUID id, UUID expectedOrganizationId,
      Long version, String action) {
    return new LocalContextDtos.Version(change(id, expectedOrganizationId, version, action, null)
        .version());
  }

  /** Acquire the complete Guard union before the Organization aggregate reads either hierarchy. */
  @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
  public void prepareOrganizationSave() {
    rules.requireWrite("PROCESS");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
  }

  @Transactional
  public LocalContextDtos.Selection saveSubprocesses(UUID organizationId, LocalContextDtos.SaveContexts request) {
    return saveSubprocesses(organizationId, request, null);
  }

  /** Organization Save joins the same transaction while keeping Local content in its own Revision. */
  @Transactional
  public LocalContextDtos.Selection saveSubprocesses(UUID organizationId, LocalContextDtos.SaveContexts request,
      UUID causedByRevisionId) {
    rules.requireWrite("PROCESS");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    var changes = request.changes();
    var seen = new HashSet<UUID>();
    if (changes == null || changes.isEmpty()) throw rules.bad("Context changes are required");
    for (var change : changes) {
      if (change == null || change.subprocessId() == null || change.operation() == null || !seen.add(change.subprocessId()))
        throw rules.bad("Select distinct context changes");
    }
    var ordered = changes.stream().sorted(Comparator.comparing(change -> change.subprocessId().toString())).toList();
    List<LocalContextDtos.Row> confirmed = new ArrayList<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(organizationId, "Save Organization Subprocesses", "Staged Local Context changes", causedByRevisionId), revision -> {
          requireRevision(revision, organizationId);
          var organization = organizations.lockById(organizationId).orElseThrow(() -> rules.referenceNotFound(organizationId));
          rules.nonDeleted(organization.getStatus());
          Map<UUID, LocalOrganizationSubprocessScopeEntity> existing = new HashMap<>();
          // All endpoint locks precede context locks, and the full batch is validated before mutation.
          for (var change : ordered) {
            var subprocess = subprocesses.lockById(change.subprocessId()).orElseThrow(() -> rules.referenceNotFound(change.subprocessId()));
            if (change.operation() == LocalContextDtos.ContextOperation.CREATE_OR_RESTORE
                || change.operation() == LocalContextDtos.ContextOperation.ACTIVATE) {
              rules.active(organization.getStatus());
              rules.active(subprocess.getStatus());
            }
          }
          for (var change : ordered) {
            var occupied = rows.findByOrganizationIdAndSubprocessId(organizationId, change.subprocessId()).orElse(null);
            if (occupied == null) {
              if (change.operation() != LocalContextDtos.ContextOperation.CREATE_OR_RESTORE
                  || change.contextId() != null || change.version() != null) throw rules.bad("Context identity changed");
              continue;
            }
            var row = rows.lockById(occupied.getId()).orElseThrow(() -> rules.notFound(occupied.getId()));
            if (!row.getId().equals(change.contextId())) throw rules.duplicate(row.getStatus());
            rules.assertVersion(row.getVersion(), change.version());
            var action = switch (change.operation()) {
              case CREATE_OR_RESTORE -> "restore";
              case ACTIVATE -> "activate";
              case INACTIVATE -> "inactivate";
              case DELETE -> "delete";
            };
            rules.transition(row.getStatus(), action);
            if (change.operation() == LocalContextDtos.ContextOperation.CREATE_OR_RESTORE
                || change.operation() == LocalContextDtos.ContextOperation.ACTIVATE) rules.dates(row.getValidFrom(), row.getValidTo());
            if (change.operation() == LocalContextDtos.ContextOperation.DELETE) requireNoLiveChildren(row.getId());
            existing.put(change.subprocessId(), row);
          }
          List<RevisionContentResult> contents = new ArrayList<>();
          MasterDataMutationResult primary = null;
          for (var change : ordered) {
            var row = existing.get(change.subprocessId());
            JsonNode before = row == null ? null : snapshot(row);
            Long expected = row == null ? null : row.getVersion();
            RevisionOperationType operation;
            if (row == null) {
              row = LocalOrganizationSubprocessScopeEntity.create(organizationId, change.subprocessId(), null, null, null, actor(), now());
              operation = RevisionOperationType.CREATE;
            } else {
              operation = switch (change.operation()) {
                case CREATE_OR_RESTORE -> { row.restore(actor(), now()); yield RevisionOperationType.RESTORE; }
                case ACTIVATE -> { row.activate(actor(), now()); yield RevisionOperationType.ACTIVATE; }
                case INACTIVATE -> { row.inactivate(actor(), now()); yield RevisionOperationType.INACTIVATE; }
                case DELETE -> { row.delete(actor(), now()); yield RevisionOperationType.DELETE; }
              };
            }
            var saved = rows.saveAndFlush(row);
            confirmed.add(map(saved));
            contents.add(RevisionContentResult.completed(RevisionEntityType.LOCAL_ORGANIZATION_SUBPROCESS_SCOPE,
                saved.getId(), operation, expected, before, snapshot(saved), saved.getVersion(), mapper.valueToTree(Map.of("validated", true))));
            if (primary == null) primary = new MasterDataMutationResult(saved.getId(), revision.revisionId(), saved.getVersion());
          }
          return RevisionOperationResult.completed(revision, primary, contents);
        });
    return new LocalContextDtos.Selection(result.primaryResult().revisionId(), List.copyOf(confirmed));
  }

  private LocalContextDtos.Mutation change(UUID id, UUID expectedOrganizationId,
      Long expectedVersion, String action, LocalContextDtos.Update update) {
    rules.requireWrite("PROCESS");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    var owner = rows.findById(id).orElseThrow(() -> rules.notFound(id));
    UUID orgId = owner.getOrganizationId();
    rules.assertOwner(expectedOrganizationId, orgId);
    AtomicReference<LocalContextDtos.Row> response = new AtomicReference<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(orgId, action + " Local Context", "Organization Subprocess Context", null),
        revision -> {
          requireRevision(revision, orgId);
          var org = organizations.lockById(orgId).orElseThrow(() -> rules.referenceNotFound(orgId));
          var subprocess = subprocesses.lockById(owner.getSubprocessId())
              .orElseThrow(() -> rules.referenceNotFound(owner.getSubprocessId()));
          var row = rows.lockById(id).orElseThrow(() -> rules.notFound(id));
          rules.assertVersion(row.getVersion(), expectedVersion);
          JsonNode before = snapshot(row);
          RevisionOperationType operation;
          if (update != null) {
            rules.nonDeleted(row.getStatus());
            rules.nonDeleted(org.getStatus());
            rules.nonDeleted(subprocess.getStatus());
            rules.dates(update.validFrom(), update.validTo());
            row.update(rules.note(update.contextNote()), update.validFrom(), update.validTo(),
                actor(), now());
            operation = RevisionOperationType.UPDATE;
          } else {
            rules.transition(row.getStatus(), action);
            operation = switch (action) {
              case "activate" -> RevisionOperationType.ACTIVATE;
              case "inactivate" -> RevisionOperationType.INACTIVATE;
              case "delete" -> RevisionOperationType.DELETE;
              case "restore" -> RevisionOperationType.RESTORE;
              default -> throw rules.bad("Unknown lifecycle action");
            };
            switch (operation) {
              case ACTIVATE, RESTORE -> {
                rules.active(org.getStatus());
                rules.active(subprocess.getStatus());
                rules.dates(row.getValidFrom(), row.getValidTo());
                if (operation == RevisionOperationType.ACTIVATE) row.activate(actor(), now());
                else row.restore(actor(), now());
              }
              case INACTIVATE -> row.inactivate(actor(), now());
              case DELETE -> {
                requireNoLiveChildren(id);
                row.delete(actor(), now());
              }
              default -> throw new IllegalStateException("Unexpected Local Context operation");
            }
          }
          var saved = rows.saveAndFlush(row);
          response.set(map(saved));
          return result(revision, saved, operation, expectedVersion, before);
        });
    return mutation(result, response.get());
  }

  private void requireNoLiveChildren(UUID id) {
    var deleted = MasterDataLifecycleStatus.DELETED;
    if (controls.existsByOrganizationSubprocessScopeIdAndStatusNot(id, deleted)
        || risks.existsByOrganizationSubprocessScopeIdAndStatusNot(id, deleted)
        || objectives.existsByOrganizationSubprocessScopeIdAndStatusNot(id, deleted)
        || requirements.existsByOrganizationSubprocessScopeIdAndStatusNot(id, deleted)
        || riskControls.existsByOrganizationSubprocessScopeIdAndStatusNot(id, deleted)
        || riskObjectives.existsByOrganizationSubprocessScopeIdAndStatusNot(id, deleted)
        || controlObjectives.existsByOrganizationSubprocessScopeIdAndStatusNot(id, deleted)
        || requirementControls.existsByOrganizationSubprocessScopeIdAndStatusNot(id, deleted)
        || policies.existsByOrganizationSubprocessScopeIdAndStatusNot(id, deleted)) {
      throw new ConflictException("LOCAL_DEPENDENCY_EXISTS", "error.masterdata.v2.dependencyExists",
          "Context has nondeleted Local children", id);
    }
  }

  private RevisionOperationResult result(RevisionExecutionContext revision,
      LocalOrganizationSubprocessScopeEntity row, RevisionOperationType operation,
      Long expected, JsonNode before) {
    var content = RevisionContentResult.completed(
        RevisionEntityType.LOCAL_ORGANIZATION_SUBPROCESS_SCOPE, row.getId(), operation,
        expected, before, snapshot(row), row.getVersion(),
        mapper.valueToTree(Map.of("validated", true)));
    return RevisionOperationResult.completed(revision,
        new MasterDataMutationResult(row.getId(), revision.revisionId(), row.getVersion()),
        List.of(content));
  }

  private LocalContextDtos.Mutation mutation(RevisionExecutionResult result, LocalContextDtos.Row row) {
    var primary = result.primaryResult();
    return new LocalContextDtos.Mutation(primary.entityId(), primary.version(),
        primary.revisionId(), row);
  }

  private void requireRevision(RevisionExecutionContext revision, UUID orgId) {
    mutationGuard.requireDomain(revision, RevisionDomain.LOCAL);
    mutationGuard.requireOrganization(revision, orgId);
    KEYS.forEach(key -> mutationGuard.requireHierarchyGuard(revision, key));
  }

  private JsonNode snapshot(LocalOrganizationSubprocessScopeEntity row) {
    return mapper.valueToTree(row);
  }

  private LocalContextDtos.Row map(LocalOrganizationSubprocessScopeEntity row) {
    var org = organizations.findById(row.getOrganizationId())
        .orElseThrow(() -> rules.referenceNotFound(row.getOrganizationId()));
    var subprocess = subprocesses.findById(row.getSubprocessId())
        .orElseThrow(() -> rules.referenceNotFound(row.getSubprocessId()));
    return new LocalContextDtos.Row(row.getId(), row.getOrganizationId(),
        org.getCode(), org.getName(), row.getSubprocessId(), subprocess.getCode(),
        subprocess.getTitle(), row.getContextNote(), row.getStatus(), row.getValidFrom(),
        row.getValidTo(), row.getVersion(), row.getCreatedAt(), row.getCreatedBy(),
        row.getUpdatedAt(), row.getUpdatedBy(), row.getDeletedAt(), row.getDeletedBy());
  }


  public record AggregatePlan(LocalOrganizationSubprocessScopeEntity row, LocalContextDtos.ContextChange change,
      boolean fresh, MasterDataLifecycleStatus target) {}
  @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
  public List<AggregatePlan> prepareAggregate(UUID organizationId, List<LocalContextDtos.ContextChange> changes, OrganizationLocalDeletions deleting) {
    if (changes == null || changes.isEmpty()) return List.of();
    rules.requireWrite("PROCESS");
    var org = organizations.findById(organizationId).orElseThrow(() -> rules.referenceNotFound(organizationId));
    var seen = new java.util.HashSet<UUID>(); var plans = new java.util.ArrayList<AggregatePlan>();
    for (var change : changes.stream().sorted(java.util.Comparator.comparing(item -> item.subprocessId().toString())).toList()) {
      if (change == null || change.subprocessId() == null || change.operation() == null || !seen.add(change.subprocessId())) throw rules.bad("Distinct Context changes are required");
      var subprocess = subprocesses.findById(change.subprocessId()).orElseThrow(() -> rules.referenceNotFound(change.subprocessId()));
      var found = rows.findByOrganizationIdAndSubprocessId(organizationId, change.subprocessId()).orElse(null);
      var row = found == null ? null : rows.lockById(found.getId()).orElseThrow(() -> rules.notFound(found.getId()));
      var target = rules.aggregateTarget(row == null ? null : row.getStatus(), OrganizationLocalDtos.Operation.valueOf(change.operation().name()), null,
          row == null ? null : row.getId(), row == null ? null : row.getVersion(), change.contextId(), change.version());
      boolean fresh = row == null;
      if (fresh || (target == MasterDataLifecycleStatus.ACTIVE && row.getStatus() != target)) { rules.active(org.getStatus()); rules.active(subprocess.getStatus()); }
      if (!fresh && target == MasterDataLifecycleStatus.DELETED) requireAggregateNoChildren(row.getId(), deleting);
      if (fresh) row = LocalOrganizationSubprocessScopeEntity.create(organizationId, change.subprocessId(), null, null, null, actor(), now());
      plans.add(new AggregatePlan(row, change, fresh, target));
    }
    return List.copyOf(plans);
  }
  @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
  public LocalOrganizationSubprocessScopeEntity resolveAggregate(UUID orgId, OrganizationLocalDtos.ContextRef ref, List<AggregatePlan> plans) {
    if (ref == null || (ref.contextId() == null) == (ref.subprocessId() == null)) throw rules.bad("Exactly one Context reference is required");
    var planned = plans.stream().filter(plan -> ref.contextId() != null ? plan.row().getId().equals(ref.contextId())
        : plan.row().getSubprocessId().equals(ref.subprocessId()) && plan.change().operation() == LocalContextDtos.ContextOperation.CREATE_OR_RESTORE).findFirst().orElse(null);
    if (planned != null) return planned.row();
    if (ref.contextId() == null) throw rules.bad("Context reference has no create/restore draft");
    var row = rows.lockById(ref.contextId()).orElseThrow(() -> rules.notFound(ref.contextId()));
    rules.assertOwner(orgId, row.getOrganizationId()); rules.nonDeleted(row.getStatus()); return row;
  }
  @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
  public RevisionContentResult applyAggregate(AggregatePlan plan) {
    var row = plan.row(); var initial = row.getStatus();
    if (!plan.fresh() && initial == plan.target()) return null;
    JsonNode before = plan.fresh() ? null : snapshot(row); Long expected = plan.fresh() ? null : row.getVersion();
    RevisionOperationType operation = plan.fresh() ? RevisionOperationType.CREATE : initial == MasterDataLifecycleStatus.DELETED ? RevisionOperationType.RESTORE
        : plan.target() == MasterDataLifecycleStatus.ACTIVE ? RevisionOperationType.ACTIVATE : plan.target() == MasterDataLifecycleStatus.INACTIVE ? RevisionOperationType.INACTIVATE : RevisionOperationType.DELETE;
    if (!plan.fresh()) switch (operation) { case RESTORE -> row.restore(actor(), now()); case ACTIVATE -> row.activate(actor(), now()); case INACTIVATE -> row.inactivate(actor(), now()); case DELETE -> row.delete(actor(), now()); default -> throw new IllegalStateException(); }
    rows.saveAndFlush(row);
    return RevisionContentResult.completed(RevisionEntityType.LOCAL_ORGANIZATION_SUBPROCESS_SCOPE, row.getId(), operation,
        expected, before, snapshot(row), row.getVersion(), mapper.valueToTree(Map.of("validated", true)));
  }
  public LocalContextDtos.Row canonical(AggregatePlan plan) { return map(plan.row()); }
  private void requireAggregateNoChildren(UUID id, OrganizationLocalDeletions deleting) {
    var deleted = MasterDataLifecycleStatus.DELETED;
    var page = org.springframework.data.domain.Pageable.unpaged();
    if (controls.findByOrganizationSubprocessScopeIdAndStatusIn(id, rules.statuses(null), page).stream().anyMatch(row -> !deleting.controls().contains(row.getId()))
        || risks.findByOrganizationSubprocessScopeIdAndStatusIn(id, rules.statuses(null), page).stream().anyMatch(row -> !deleting.risks().contains(row.getId()))
        || objectives.findByOrganizationSubprocessScopeIdAndStatusIn(id, rules.statuses(null), page).stream().anyMatch(row -> !deleting.controlObjectives().contains(row.getId()))
        || requirements.findByOrganizationSubprocessScopeIdAndStatusIn(id, rules.statuses(null), page).stream().anyMatch(row -> !deleting.requirements().contains(row.getId()))
        || policies.findByOrganizationSubprocessScopeIdAndStatusIn(id, rules.statuses(null), page).stream().anyMatch(row -> !deleting.contextPolicies().contains(row.getId()))
        || riskControls.existsByOrganizationSubprocessScopeIdAndStatusNot(id, deleted) || riskObjectives.existsByOrganizationSubprocessScopeIdAndStatusNot(id, deleted)
        || controlObjectives.existsByOrganizationSubprocessScopeIdAndStatusNot(id, deleted) || requirementControls.existsByOrganizationSubprocessScopeIdAndStatusNot(id, deleted))
      throw rules.invalid("LOCAL_DEPENDENCY_EXISTS", "Context has undeleted dependents");
  }

  private UUID actor() { return currentUser.getCurrentPrincipal().getUserId(); }
  private Instant now() { return Instant.now(clock); }
}
