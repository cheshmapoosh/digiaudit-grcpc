package com.digiaudit.grcpc.modules.masterdata.local.application;

import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalControlObjectiveCoverageDtos;
import com.digiaudit.grcpc.modules.masterdata.local.domain.LocalSourceType;
import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.*;
import com.digiaudit.grcpc.modules.masterdata.local.domain.repository.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.entity.CentralSubprocessControlScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.repository.CentralSubprocessControlScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.repository.CentralControlObjectiveRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.entity.CentralSubprocessControlObjectiveScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.repository.CentralSubprocessControlObjectiveScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.coverage.controlcontrolobjective.domain.entity.CentralSubprocessControlControlObjectiveCoverageEntity;
import com.digiaudit.grcpc.modules.masterdata.coverage.controlcontrolobjective.domain.repository.CentralSubprocessControlControlObjectiveCoverageRepository;
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
public class LocalControlObjectiveCoverageService {
  private static final List<MasterDataHierarchyKey> KEYS = List.of(MasterDataHierarchyKey.CONTROL, MasterDataHierarchyKey.ORGANIZATION, MasterDataHierarchyKey.PROCESS);
  private final LocalCommandRules rules;
  private final RevisionMutationGuard mutationGuard;
  private final MasterDataRevisionCoordinator revisions;
  private final LocalOrganizationSubprocessScopeRepository contexts;
  private final LocalSubprocessControlControlObjectiveCoverageRepository rows;
  private final OrganizationRepository organizations;
  private final CentralSubprocessRepository subprocesses;
  private final CentralSubprocessControlControlObjectiveCoverageRepository centralReferences;
  private final CentralControlRepository definitionsControl;
  private final CentralSubprocessControlScopeRepository centralScopesControl;
  private final LocalSubprocessControlScopeRepository endpointsControl;
  private final CentralControlObjectiveRepository definitionsObjective;
  private final CentralSubprocessControlObjectiveScopeRepository centralScopesObjective;
  private final LocalSubprocessControlObjectiveScopeRepository endpointsObjective;
  private final CurrentUserProvider currentUser;
  private final ObjectMapper mapper;
  private final Clock clock;

  public LocalControlObjectiveCoverageService(LocalCommandRules rules, RevisionMutationGuard mutationGuard,
      MasterDataRevisionCoordinator revisions, LocalOrganizationSubprocessScopeRepository contexts,
      LocalSubprocessControlControlObjectiveCoverageRepository rows, OrganizationRepository organizations, CentralSubprocessRepository subprocesses,
      CentralSubprocessControlControlObjectiveCoverageRepository centralReferences,
      CentralControlRepository definitionsControl,
      CentralSubprocessControlScopeRepository centralScopesControl, LocalSubprocessControlScopeRepository endpointsControl,
      CentralControlObjectiveRepository definitionsObjective,
      CentralSubprocessControlObjectiveScopeRepository centralScopesObjective, LocalSubprocessControlObjectiveScopeRepository endpointsObjective, CurrentUserProvider currentUser,
      ObjectMapper mapper, @Qualifier("masterDataRevisionClock") Clock clock) {
    this.rules = rules;
    this.mutationGuard = mutationGuard;
    this.revisions = revisions;
    this.contexts = contexts;
    this.rows = rows;
    this.organizations = organizations;
    this.subprocesses = subprocesses;
    this.centralReferences = centralReferences;
    this.definitionsControl = definitionsControl;
    this.centralScopesControl = centralScopesControl;
    this.endpointsControl = endpointsControl;
    this.definitionsObjective = definitionsObjective;
    this.centralScopesObjective = centralScopesObjective;
    this.endpointsObjective = endpointsObjective;
    this.currentUser = currentUser;
    this.mapper = mapper;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public LocalControlObjectiveCoverageDtos.Page list(UUID contextId, UUID expectedOrganizationId,
      MasterDataLifecycleStatus status, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "CONTROL");
    var pageable = rules.pageable(page, size, sort, direction);
    var context = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    rules.assertOwner(expectedOrganizationId, context.getOrganizationId());
    var result = rows.findByOrganizationSubprocessScopeIdAndStatusIn(contextId,
        rules.statuses(status), pageable);
    return new LocalControlObjectiveCoverageDtos.Page(result.getContent().stream().map(this::map).toList(),
        page, size, result.getTotalElements(), result.getTotalPages());
  }

  @Transactional(readOnly = true)
  public LocalControlObjectiveCoverageDtos.Row detail(UUID contextId, UUID id, UUID expectedOrganizationId) {
    rules.requireView("PROCESS", "CONTROL");
    var row = rows.findById(id).orElseThrow(() -> rules.notFound(id));
    if (!row.getOrganizationSubprocessScopeId().equals(contextId)) throw rules.notFound(id);
    var context = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    rules.assertOwner(expectedOrganizationId, context.getOrganizationId());
    return map(row);
  }

  @Transactional
  public LocalControlObjectiveCoverageDtos.Mutation create(UUID contextId, UUID expectedOrganizationId, LocalControlObjectiveCoverageDtos.Create request) {
    rules.requireWrite("PROCESS", "CONTROL");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    var owner = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    UUID orgId = owner.getOrganizationId();
    rules.assertOwner(expectedOrganizationId, orgId);
    AtomicReference<LocalControlObjectiveCoverageDtos.Row> response = new AtomicReference<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(orgId, "Create Local ControlObjective Coverage", "Local Coverage", null),
        revision -> {
          requireRevision(revision, orgId);
          var locked = lockReferences(orgId, owner.getSubprocessId(), contextId,
              request.localControlScopeId(), request.localControlObjectiveScopeId(), request.centralControlControlObjectiveCoverageId());
          validate(locked, request.sourceType(), request.centralControlControlObjectiveCoverageId(), request.validFrom(),
              request.validTo(), true);
          rows.findByOrganizationSubprocessScopeIdAndLocalControlScopeIdAndLocalControlObjectiveScopeId(
              contextId, request.localControlScopeId(), request.localControlObjectiveScopeId())
              .ifPresent(other -> { throw rules.duplicate(other.getStatus()); });
          var row = rows.saveAndFlush(LocalSubprocessControlControlObjectiveCoverageEntity.create(contextId,
              request.localControlScopeId(), request.localControlObjectiveScopeId(), request.centralControlControlObjectiveCoverageId(),
              request.sourceType(), rules.note(request.coverageNote()),
              request.validFrom(), request.validTo(), actor(), now()));
          response.set(map(row));
          return result(revision, row, RevisionOperationType.CREATE, null, null);
        });
    return mutation(result, response.get());
  }

  @Transactional
  public LocalControlObjectiveCoverageDtos.Mutation update(UUID contextId, UUID id, UUID expectedOrganizationId,
      LocalControlObjectiveCoverageDtos.Update request) {
    return change(contextId, id, expectedOrganizationId, request.version(), "update", request);
  }

  @Transactional
  public LocalControlObjectiveCoverageDtos.Version lifecycle(UUID contextId, UUID id, UUID expectedOrganizationId,
      Long version, String action) {
    return new LocalControlObjectiveCoverageDtos.Version(change(contextId, id, expectedOrganizationId, version, action, null)
        .version());
  }

  private LocalControlObjectiveCoverageDtos.Mutation change(UUID contextId, UUID id, UUID expectedOrganizationId,
      Long expectedVersion, String action, LocalControlObjectiveCoverageDtos.Update update) {
    rules.requireWrite("PROCESS", "CONTROL");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    var owner = rows.findById(id).orElseThrow(() -> rules.notFound(id));
    if (!owner.getOrganizationSubprocessScopeId().equals(contextId)) throw rules.notFound(id);
    var contextOwner = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    UUID orgId = contextOwner.getOrganizationId();
    rules.assertOwner(expectedOrganizationId, orgId);
    AtomicReference<LocalControlObjectiveCoverageDtos.Row> response = new AtomicReference<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(orgId, action + " Local ControlObjective Coverage", "Local Coverage", null),
        revision -> {
          requireRevision(revision, orgId);
          var locked = lockReferences(orgId, contextOwner.getSubprocessId(), contextId,
              owner.getLocalControlScopeId(), owner.getLocalControlObjectiveScopeId(), owner.getCentralControlControlObjectiveCoverageId());
          var row = rows.lockById(id).orElseThrow(() -> rules.notFound(id));
          rules.assertVersion(row.getVersion(), expectedVersion);
          JsonNode before = snapshot(row);
          RevisionOperationType operation;
          if (update != null) {
            rules.nonDeleted(row.getStatus());
            validate(locked, row.getSourceType(), row.getCentralControlControlObjectiveCoverageId(),
                update.validFrom(), update.validTo(), false);
            row.update(rules.note(update.coverageNote()), update.validFrom(),
                update.validTo(), actor(), now());
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
                validate(locked, row.getSourceType(), row.getCentralControlControlObjectiveCoverageId(),
                    row.getValidFrom(), row.getValidTo(), true);
                if (operation == RevisionOperationType.ACTIVATE) row.activate(actor(), now());
                else row.restore(actor(), now());
              }
              case INACTIVATE -> row.inactivate(actor(), now());
              case DELETE -> row.delete(actor(), now());
              default -> throw new IllegalStateException("Unexpected Local Coverage operation");
            }
          }
          var saved = rows.saveAndFlush(row);
          response.set(map(saved));
          return result(revision, saved, operation, expectedVersion, before);
        });
    return mutation(result, response.get());
  }

  private record Locked(
      com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationEntity org,
      com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity subprocess,
      LocalOrganizationSubprocessScopeEntity context,
      LocalSubprocessControlScopeEntity endpointControl, LocalSubprocessControlObjectiveScopeEntity endpointObjective,
      CentralControlEntity definitionControl, CentralControlObjectiveEntity definitionObjective,
      CentralSubprocessControlScopeEntity centralScopeControl, CentralSubprocessControlObjectiveScopeEntity centralScopeObjective,
      CentralSubprocessControlControlObjectiveCoverageEntity central) {}

  private Locked lockReferences(UUID orgId, UUID subprocessId, UUID contextId,
      UUID leftId, UUID rightId, UUID centralId) {
    // Immutable FK hints are read only after all hierarchy Guards. Mutable state is
    // validated exclusively from the subsequent locked rows.
    var hintControl = endpointsControl.findById(leftId)
        .orElseThrow(() -> rules.referenceNotFound(leftId));
    var hintObjective = endpointsObjective.findById(rightId)
        .orElseThrow(() -> rules.referenceNotFound(rightId));
    var centralHint = centralId == null ? null : centralReferences.findById(centralId)
        .orElseThrow(() -> rules.referenceNotFound(centralId));
    var org = organizations.lockById(orgId).orElseThrow(() -> rules.referenceNotFound(orgId));
    var subprocess = subprocesses.lockById(subprocessId)
        .orElseThrow(() -> rules.referenceNotFound(subprocessId));
    var definitionControl = definitionsControl.lockById(hintControl.getControlId())
        .orElseThrow(() -> rules.referenceNotFound(hintControl.getControlId()));
    var centralScopeControl = centralHint == null ? null
        : centralScopesControl.lockById(centralHint.getControlScopeId())
            .orElseThrow(() -> rules.referenceNotFound(centralHint.getControlScopeId()));
    var definitionObjective = definitionsObjective.lockById(hintObjective.getControlObjectiveId())
        .orElseThrow(() -> rules.referenceNotFound(hintObjective.getControlObjectiveId()));
    var centralScopeObjective = centralHint == null ? null
        : centralScopesObjective.lockById(centralHint.getControlObjectiveScopeId())
            .orElseThrow(() -> rules.referenceNotFound(centralHint.getControlObjectiveScopeId()));
    var central = centralId == null ? null : centralReferences.lockById(centralId)
        .orElseThrow(() -> rules.referenceNotFound(centralId));
    var context = contexts.lockById(contextId).orElseThrow(() -> rules.notFound(contextId));
    var endpointControl = endpointsControl.lockById(leftId)
        .orElseThrow(() -> rules.referenceNotFound(leftId));
    var endpointObjective = endpointsObjective.lockById(rightId)
        .orElseThrow(() -> rules.referenceNotFound(rightId));
    if (!context.getOrganizationId().equals(orgId)
        || !context.getSubprocessId().equals(subprocessId)
        || !endpointControl.getOrganizationSubprocessScopeId().equals(contextId)
        || !endpointObjective.getOrganizationSubprocessScopeId().equals(contextId)) {
      throw rules.invalid("CROSS_LOCAL_CONTEXT_COVERAGE", "Coverage endpoints cross Context");
    }
    return new Locked(org, subprocess, context, endpointControl, endpointObjective, definitionControl, definitionObjective, centralScopeControl, centralScopeObjective, central);
  }

  private void validate(Locked locked, LocalSourceType source, UUID centralId,
      LocalDate from, LocalDate to, boolean active) {
    rules.dates(from, to);
    if (source == null || (source == LocalSourceType.INHERITED_FROM_CENTRAL)
        != (centralId != null)) {
      throw rules.invalid("LOCAL_INHERITED_REFERENCE_MISMATCH", "Central Coverage shape is invalid");
    }
    if (active) {
      rules.active(locked.org.getStatus());
      rules.active(locked.subprocess.getStatus());
      rules.active(locked.context.getStatus());
    } else {
      rules.nonDeleted(locked.org.getStatus());
      rules.nonDeleted(locked.subprocess.getStatus());
      rules.nonDeleted(locked.context.getStatus());
    }
    if (active) rules.active(locked.endpointControl.getStatus());
    else rules.nonDeleted(locked.endpointControl.getStatus());
    if (active) rules.active(locked.definitionControl.getStatus());
    else rules.nonDeleted(locked.definitionControl.getStatus());
    if (active) rules.active(locked.endpointObjective.getStatus());
    else rules.nonDeleted(locked.endpointObjective.getStatus());
    if (active) rules.active(locked.definitionObjective.getStatus());
    else rules.nonDeleted(locked.definitionObjective.getStatus());
    if (locked.central != null) {
      if (!locked.central.getSubprocessId().equals(locked.context.getSubprocessId())) {
        throw rules.invalid("LOCAL_INHERITED_REFERENCE_MISMATCH", "Central Coverage Subprocess mismatch");
      }
      if (!locked.centralScopeControl.getControlId().equals(locked.endpointControl.getControlId())
          || !locked.centralScopeControl.getSubprocessId().equals(locked.context.getSubprocessId())
          || !locked.central.getControlScopeId().equals(locked.centralScopeControl.getId())) {
        throw rules.invalid("LOCAL_INHERITED_REFERENCE_MISMATCH", "Central Coverage endpoint mismatch");
      }
      if (active) rules.active(locked.centralScopeControl.getStatus());
      else rules.nonDeleted(locked.centralScopeControl.getStatus());
      if (!locked.centralScopeObjective.getControlObjectiveId().equals(locked.endpointObjective.getControlObjectiveId())
          || !locked.centralScopeObjective.getSubprocessId().equals(locked.context.getSubprocessId())
          || !locked.central.getControlObjectiveScopeId().equals(locked.centralScopeObjective.getId())) {
        throw rules.invalid("LOCAL_INHERITED_REFERENCE_MISMATCH", "Central Coverage endpoint mismatch");
      }
      if (active) rules.active(locked.centralScopeObjective.getStatus());
      else rules.nonDeleted(locked.centralScopeObjective.getStatus());
      if (active) rules.active(locked.central.getStatus());
      else rules.nonDeleted(locked.central.getStatus());
      if (!rules.contained(from, to, locked.central.getValidFrom(), locked.central.getValidTo())) {
        throw rules.invalid("LOCAL_VALIDITY_OUTSIDE_CENTRAL_VALIDITY",
            "Local interval exceeds Central Coverage");
      }
    }
  }

  private RevisionOperationResult result(RevisionExecutionContext revision, LocalSubprocessControlControlObjectiveCoverageEntity row,
      RevisionOperationType operation, Long expected, JsonNode before) {
    var content = RevisionContentResult.completed(RevisionEntityType.LOCAL_SUBPROCESS_CONTROL_CONTROL_OBJECTIVE_COVERAGE,
        row.getId(), operation, expected, before, snapshot(row), row.getVersion(),
        mapper.valueToTree(Map.of("validated", true)));
    return RevisionOperationResult.completed(revision,
        new MasterDataMutationResult(row.getId(), revision.revisionId(), row.getVersion()),
        List.of(content));
  }

  private LocalControlObjectiveCoverageDtos.Mutation mutation(RevisionExecutionResult result, LocalControlObjectiveCoverageDtos.Row row) {
    var primary = result.primaryResult();
    return new LocalControlObjectiveCoverageDtos.Mutation(primary.entityId(), primary.version(), primary.revisionId(), row);
  }

  private void requireRevision(RevisionExecutionContext revision, UUID orgId) {
    mutationGuard.requireDomain(revision, RevisionDomain.LOCAL);
    mutationGuard.requireOrganization(revision, orgId);
    KEYS.forEach(key -> mutationGuard.requireHierarchyGuard(revision, key));
  }

  private JsonNode snapshot(LocalSubprocessControlControlObjectiveCoverageEntity row) { return mapper.valueToTree(row); }

  private LocalControlObjectiveCoverageDtos.Row map(LocalSubprocessControlControlObjectiveCoverageEntity row) {
    var context = contexts.findById(row.getOrganizationSubprocessScopeId())
        .orElseThrow(() -> rules.notFound(row.getOrganizationSubprocessScopeId()));
    var org = organizations.findById(context.getOrganizationId())
        .orElseThrow(() -> rules.referenceNotFound(context.getOrganizationId()));
    var subprocess = subprocesses.findById(context.getSubprocessId())
        .orElseThrow(() -> rules.referenceNotFound(context.getSubprocessId()));
    var left = endpointsControl.findById(row.getLocalControlScopeId())
        .orElseThrow(() -> rules.referenceNotFound(row.getLocalControlScopeId()));
    var right = endpointsObjective.findById(row.getLocalControlObjectiveScopeId())
        .orElseThrow(() -> rules.referenceNotFound(row.getLocalControlObjectiveScopeId()));
    var leftDefinition = definitionsControl.findById(left.getControlId())
        .orElseThrow(() -> rules.referenceNotFound(left.getControlId()));
    var rightDefinition = definitionsObjective.findById(right.getControlObjectiveId())
        .orElseThrow(() -> rules.referenceNotFound(right.getControlObjectiveId()));
    var central = row.getCentralControlControlObjectiveCoverageId() == null ? null
        : centralReferences.findById(row.getCentralControlControlObjectiveCoverageId())
            .orElseThrow(() -> rules.referenceNotFound(row.getCentralControlControlObjectiveCoverageId()));
    return new LocalControlObjectiveCoverageDtos.Row(row.getId(), context.getOrganizationId(), org.getCode(),
        org.getName(), context.getId(), context.getSubprocessId(), subprocess.getCode(),
        subprocess.getTitle(), context.getStatus(), left.getId(), left.getStatus(),
        left.getControlId(), leftDefinition.getCode(), leftDefinition.getTitle(),
        right.getId(), right.getStatus(), right.getControlObjectiveId(),
        rightDefinition.getCode(), rightDefinition.getTitle(), row.getCentralControlControlObjectiveCoverageId(),
        central == null ? null : central.getStatus(),
        central == null ? null : central.getValidFrom(),
        central == null ? null : central.getValidTo(), row.getSourceType(),
        row.getCoverageNote(), row.getStatus(), row.getValidFrom(), row.getValidTo(),
        row.getVersion(), row.getCreatedAt(), row.getCreatedBy(), row.getUpdatedAt(),
        row.getUpdatedBy(), row.getDeletedAt(), row.getDeletedBy());
  }

  private UUID actor() { return currentUser.getCurrentPrincipal().getUserId(); }
  private Instant now() { return Instant.now(clock); }
}

