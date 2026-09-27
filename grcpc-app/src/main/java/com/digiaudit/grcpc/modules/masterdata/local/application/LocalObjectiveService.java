package com.digiaudit.grcpc.modules.masterdata.local.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalObjectiveDtos;
import com.digiaudit.grcpc.modules.masterdata.local.domain.LocalSourceType;
import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.*;
import com.digiaudit.grcpc.modules.masterdata.local.domain.repository.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.repository.CentralControlObjectiveRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.entity.CentralSubprocessControlObjectiveScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.repository.CentralSubprocessControlObjectiveScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.*;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.*;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LocalObjectiveService {
  private static final List<MasterDataHierarchyKey> KEYS = List.of(MasterDataHierarchyKey.ORGANIZATION, MasterDataHierarchyKey.PROCESS);
  private final LocalCommandRules rules;
  private final RevisionMutationGuard mutationGuard;
  private final MasterDataRevisionCoordinator revisions;
  private final LocalOrganizationSubprocessScopeRepository contexts;
  private final LocalSubprocessControlObjectiveScopeRepository rows;
  private final OrganizationRepository organizations;
  private final CentralSubprocessRepository subprocesses;
  private final CentralControlObjectiveRepository definitions;
  private final CentralSubprocessControlObjectiveScopeRepository centralReferences;
  private final LocalSubprocessRiskControlObjectiveCoverageRepository dependent0;
  private final LocalSubprocessControlControlObjectiveCoverageRepository dependent1;
  private final CurrentUserProvider currentUser;
  private final ObjectMapper mapper;
  private final Clock clock;

  public LocalObjectiveService(LocalCommandRules rules, RevisionMutationGuard mutationGuard,
      MasterDataRevisionCoordinator revisions, LocalOrganizationSubprocessScopeRepository contexts,
      LocalSubprocessControlObjectiveScopeRepository rows, OrganizationRepository organizations,
      CentralSubprocessRepository subprocesses, CentralControlObjectiveRepository definitions,
      CentralSubprocessControlObjectiveScopeRepository centralReferences,
      LocalSubprocessRiskControlObjectiveCoverageRepository dependent0, LocalSubprocessControlControlObjectiveCoverageRepository dependent1, CurrentUserProvider currentUser,
      ObjectMapper mapper, @Qualifier("masterDataRevisionClock") Clock clock) {
    this.rules = rules;
    this.mutationGuard = mutationGuard;
    this.revisions = revisions;
    this.contexts = contexts;
    this.rows = rows;
    this.organizations = organizations;
    this.subprocesses = subprocesses;
    this.definitions = definitions;
    this.centralReferences = centralReferences;
    this.dependent0 = dependent0;
    this.dependent1 = dependent1;
    this.currentUser = currentUser;
    this.mapper = mapper;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public LocalObjectiveDtos.Page list(UUID contextId, UUID expectedOrganizationId,
      MasterDataLifecycleStatus status, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "CONTROL");
    var pageable = rules.pageable(page, size, sort, direction);
    var context = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    rules.assertOwner(expectedOrganizationId, context.getOrganizationId());
    var result = rows.findByOrganizationSubprocessScopeIdAndStatusIn(
        contextId, rules.statuses(status), pageable);
    return new LocalObjectiveDtos.Page(result.getContent().stream().map(this::map).toList(),
        page, size, result.getTotalElements(), result.getTotalPages());
  }

  @Transactional(readOnly = true)
  public LocalObjectiveDtos.Row detail(UUID contextId, UUID id, UUID expectedOrganizationId) {
    rules.requireView("PROCESS", "CONTROL");
    var row = rows.findById(id).orElseThrow(() -> rules.notFound(id));
    if (!row.getOrganizationSubprocessScopeId().equals(contextId)) throw rules.notFound(id);
    var context = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    rules.assertOwner(expectedOrganizationId, context.getOrganizationId());
    return map(row);
  }

  @Transactional
  public LocalObjectiveDtos.Mutation create(UUID contextId, UUID expectedOrganizationId, LocalObjectiveDtos.Create request) {
    rules.requireWrite("PROCESS", "CONTROL");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    var owner = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    UUID orgId = owner.getOrganizationId();
    rules.assertOwner(expectedOrganizationId, orgId);
    AtomicReference<LocalObjectiveDtos.Row> response = new AtomicReference<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(orgId, "Create Local Objective Scope", "Local Objective Scope", null),
        revision -> {
          requireRevision(revision, orgId);
          var org = organizations.lockById(orgId)
              .orElseThrow(() -> rules.referenceNotFound(orgId));
          var subprocess = subprocesses.lockById(owner.getSubprocessId())
              .orElseThrow(() -> rules.referenceNotFound(owner.getSubprocessId()));
          var definition = definitions.lockById(request.controlObjectiveId())
              .orElseThrow(() -> rules.referenceNotFound(request.controlObjectiveId()));
          var central = request.centralControlObjectiveScopeId() == null ? null
              : centralReferences.lockById(request.centralControlObjectiveScopeId())
                  .orElseThrow(() -> rules.referenceNotFound(request.centralControlObjectiveScopeId()));
          var context = contexts.lockById(contextId).orElseThrow(() -> rules.notFound(contextId));
          rules.active(org.getStatus());
          rules.active(subprocess.getStatus());
          rules.active(context.getStatus());
          rules.active(definition.getStatus());
          validateSource(request.sourceType(), request.centralControlObjectiveScopeId(), request.controlObjectiveId(),
              context.getSubprocessId(), request.validFrom(), request.validTo(), central, true);
          rows.findByOrganizationSubprocessScopeIdAndControlObjectiveId(contextId, request.controlObjectiveId())
              .ifPresent(other -> { throw rules.duplicate(other.getStatus()); });
          var row = rows.saveAndFlush(LocalSubprocessControlObjectiveScopeEntity.create(contextId, request.controlObjectiveId(),
              request.centralControlObjectiveScopeId(), request.sourceType(), request.validFrom(), request.validTo(),
              actor(), now()));
          response.set(map(row));
          return result(revision, row, RevisionOperationType.CREATE, null, null);
        });
    return mutation(result, response.get());
  }

  @Transactional
  public LocalObjectiveDtos.Mutation update(UUID contextId, UUID id, UUID expectedOrganizationId,
      LocalObjectiveDtos.Update request) {
    return change(contextId, id, expectedOrganizationId, request.version(), "update", request);
  }

  @Transactional
  public LocalObjectiveDtos.Version lifecycle(UUID contextId, UUID id, UUID expectedOrganizationId,
      Long version, String action) {
    return new LocalObjectiveDtos.Version(change(contextId, id, expectedOrganizationId, version, action, null)
        .version());
  }

  private LocalObjectiveDtos.Mutation change(UUID contextId, UUID id, UUID expectedOrganizationId,
      Long expectedVersion, String action, LocalObjectiveDtos.Update update) {
    rules.requireWrite("PROCESS", "CONTROL");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    var owner = rows.findById(id).orElseThrow(() -> rules.notFound(id));
    if (!owner.getOrganizationSubprocessScopeId().equals(contextId)) throw rules.notFound(id);
    var contextOwner = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    UUID orgId = contextOwner.getOrganizationId();
    rules.assertOwner(expectedOrganizationId, orgId);
    AtomicReference<LocalObjectiveDtos.Row> response = new AtomicReference<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(orgId, action + " Local Objective Scope", "Local Objective Scope", null),
        revision -> {
          requireRevision(revision, orgId);
          var org = organizations.lockById(orgId).orElseThrow(() -> rules.referenceNotFound(orgId));
          var subprocess = subprocesses.lockById(contextOwner.getSubprocessId())
              .orElseThrow(() -> rules.referenceNotFound(contextOwner.getSubprocessId()));
          var definition = definitions.lockById(owner.getControlObjectiveId())
              .orElseThrow(() -> rules.referenceNotFound(owner.getControlObjectiveId()));
          var central = owner.getCentralControlObjectiveScopeId() == null ? null
              : centralReferences.lockById(owner.getCentralControlObjectiveScopeId())
                  .orElseThrow(() -> rules.referenceNotFound(owner.getCentralControlObjectiveScopeId()));
          var context = contexts.lockById(contextId).orElseThrow(() -> rules.notFound(contextId));
          var row = rows.lockById(id).orElseThrow(() -> rules.notFound(id));
          rules.assertVersion(row.getVersion(), expectedVersion);
          JsonNode before = snapshot(row);
          RevisionOperationType operation;
          if (update != null) {
            rules.nonDeleted(row.getStatus());
            rules.nonDeleted(org.getStatus());
            rules.nonDeleted(subprocess.getStatus());
            rules.nonDeleted(context.getStatus());
            rules.nonDeleted(definition.getStatus());
            if (central != null) rules.nonDeleted(central.getStatus());
            validateSource(row.getSourceType(), row.getCentralControlObjectiveScopeId(), row.getControlObjectiveId(),
                context.getSubprocessId(), update.validFrom(), update.validTo(), central, false);
            row.update(update.validFrom(), update.validTo(), actor(), now());
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
                rules.active(context.getStatus());
                rules.active(definition.getStatus());
                validateSource(row.getSourceType(), row.getCentralControlObjectiveScopeId(), row.getControlObjectiveId(),
                    context.getSubprocessId(), row.getValidFrom(), row.getValidTo(), central, true);
                if (operation == RevisionOperationType.ACTIVATE) row.activate(actor(), now());
                else row.restore(actor(), now());
              }
              case INACTIVATE -> row.inactivate(actor(), now());
              case DELETE -> {
                requireNoLiveChildren(id);
                row.delete(actor(), now());
              }
              default -> throw new IllegalStateException("Unexpected Local Scope operation");
            }
          }
          var saved = rows.saveAndFlush(row);
          response.set(map(saved));
          return result(revision, saved, operation, expectedVersion, before);
        });
    return mutation(result, response.get());
  }

  private void validateSource(LocalSourceType sourceType, UUID centralReferenceId,
      UUID definitionId, UUID subprocessId, LocalDate from, LocalDate to,
      CentralSubprocessControlObjectiveScopeEntity central, boolean active) {
    rules.dates(from, to);
    if (sourceType == null ||
        (sourceType == LocalSourceType.INHERITED_FROM_CENTRAL) != (centralReferenceId != null)) {
      throw rules.invalid("LOCAL_INHERITED_REFERENCE_MISMATCH", "Central Scope reference shape is invalid");
    }
    if (central != null) {
      if (!central.getControlObjectiveId().equals(definitionId)
          || !central.getSubprocessId().equals(subprocessId)) {
        throw rules.invalid("LOCAL_INHERITED_REFERENCE_MISMATCH", "Central Scope does not match");
      }
      if (active) rules.active(central.getStatus());
      else rules.nonDeleted(central.getStatus());
      if (!rules.contained(from, to, central.getValidFrom(), central.getValidTo())) {
        throw rules.invalid("LOCAL_VALIDITY_OUTSIDE_CENTRAL_VALIDITY",
            "Local interval exceeds Central Scope");
      }
    }
  }

  private void requireNoLiveChildren(UUID id) {
    var deleted = MasterDataLifecycleStatus.DELETED;
    if (dependent0.existsByLocalControlObjectiveScopeIdAndStatusNot(id, deleted)
        || dependent1.existsByLocalControlObjectiveScopeIdAndStatusNot(id, deleted)) {
      throw new ConflictException("LOCAL_DEPENDENCY_EXISTS",
          "error.masterdata.v2.dependencyExists", "Local Scope has live children", id);
    }
  }

  private RevisionOperationResult result(RevisionExecutionContext revision, LocalSubprocessControlObjectiveScopeEntity row,
      RevisionOperationType operation, Long expected, JsonNode before) {
    var content = RevisionContentResult.completed(RevisionEntityType.LOCAL_SUBPROCESS_CONTROL_OBJECTIVE_SCOPE, row.getId(), operation,
        expected, before, snapshot(row), row.getVersion(),
        mapper.valueToTree(Map.of("validated", true)));
    return RevisionOperationResult.completed(revision,
        new MasterDataMutationResult(row.getId(), revision.revisionId(), row.getVersion()),
        List.of(content));
  }

  private LocalObjectiveDtos.Mutation mutation(RevisionExecutionResult result, LocalObjectiveDtos.Row row) {
    var primary = result.primaryResult();
    return new LocalObjectiveDtos.Mutation(primary.entityId(), primary.version(), primary.revisionId(), row);
  }

  private void requireRevision(RevisionExecutionContext revision, UUID orgId) {
    mutationGuard.requireDomain(revision, RevisionDomain.LOCAL);
    mutationGuard.requireOrganization(revision, orgId);
    KEYS.forEach(key -> mutationGuard.requireHierarchyGuard(revision, key));
  }

  private JsonNode snapshot(LocalSubprocessControlObjectiveScopeEntity row) { return mapper.valueToTree(row); }

  private LocalObjectiveDtos.Row map(LocalSubprocessControlObjectiveScopeEntity row) {
    var context = contexts.findById(row.getOrganizationSubprocessScopeId())
        .orElseThrow(() -> rules.notFound(row.getOrganizationSubprocessScopeId()));
    var org = organizations.findById(context.getOrganizationId())
        .orElseThrow(() -> rules.referenceNotFound(context.getOrganizationId()));
    var subprocess = subprocesses.findById(context.getSubprocessId())
        .orElseThrow(() -> rules.referenceNotFound(context.getSubprocessId()));
    var definition = definitions.findById(row.getControlObjectiveId())
        .orElseThrow(() -> rules.referenceNotFound(row.getControlObjectiveId()));
    var central = row.getCentralControlObjectiveScopeId() == null ? null
        : centralReferences.findById(row.getCentralControlObjectiveScopeId())
            .orElseThrow(() -> rules.referenceNotFound(row.getCentralControlObjectiveScopeId()));
    return new LocalObjectiveDtos.Row(row.getId(), context.getOrganizationId(), org.getCode(),
        org.getName(), context.getId(), context.getSubprocessId(), subprocess.getCode(),
        subprocess.getTitle(), context.getStatus(), row.getControlObjectiveId(),
        definition.getCode(), definition.getTitle(), row.getCentralControlObjectiveScopeId(),
        central == null ? null : central.getStatus(),
        central == null ? null : central.getValidFrom(),
        central == null ? null : central.getValidTo(), row.getSourceType(),
        row.getStatus(), row.getValidFrom(), row.getValidTo(), row.getVersion(),
        row.getCreatedAt(), row.getCreatedBy(), row.getUpdatedAt(), row.getUpdatedBy(),
        row.getDeletedAt(), row.getDeletedBy());
  }

  private UUID actor() { return currentUser.getCurrentPrincipal().getUserId(); }
  private Instant now() { return Instant.now(clock); }
}

