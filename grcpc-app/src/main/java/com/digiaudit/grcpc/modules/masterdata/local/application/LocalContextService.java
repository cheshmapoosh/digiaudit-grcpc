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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
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

  @Transactional
  public LocalContextDtos.Version lifecycle(UUID id, UUID expectedOrganizationId,
      Long version, String action) {
    return new LocalContextDtos.Version(change(id, expectedOrganizationId, version, action, null)
        .version());
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

  private UUID actor() { return currentUser.getCurrentPrincipal().getUserId(); }
  private Instant now() { return Instant.now(clock); }
}
