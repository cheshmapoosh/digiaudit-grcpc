package com.digiaudit.grcpc.modules.masterdata.local.application;

import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalRequirementControlCoverageDtos;
import com.digiaudit.grcpc.modules.masterdata.local.domain.LocalSourceType;
import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.*;
import com.digiaudit.grcpc.modules.masterdata.local.domain.repository.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationRequirementEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRequirementRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.entity.CentralSubprocessRequirementScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.repository.CentralSubprocessRequirementScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.entity.CentralSubprocessControlScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.repository.CentralSubprocessControlScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.coverage.requirementcontrol.domain.entity.CentralSubprocessRequirementControlCoverageEntity;
import com.digiaudit.grcpc.modules.masterdata.coverage.requirementcontrol.domain.repository.CentralSubprocessRequirementControlCoverageRepository;
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
public class LocalRequirementControlCoverageService {
  private static final List<MasterDataHierarchyKey> KEYS = List.of(MasterDataHierarchyKey.CONTROL, MasterDataHierarchyKey.ORGANIZATION, MasterDataHierarchyKey.PROCESS, MasterDataHierarchyKey.REGULATION);
  private final LocalCommandRules rules;
  private final RevisionMutationGuard mutationGuard;
  private final MasterDataRevisionCoordinator revisions;
  private final LocalOrganizationSubprocessScopeRepository contexts;
  private final LocalSubprocessRequirementControlCoverageRepository rows;
  private final OrganizationRepository organizations;
  private final CentralSubprocessRepository subprocesses;
  private final CentralSubprocessRequirementControlCoverageRepository centralReferences;
  private final CentralControlRepository definitionsControl;
  private final CentralSubprocessControlScopeRepository centralScopesControl;
  private final LocalSubprocessControlScopeRepository endpointsControl;
  private final CentralRegulationRequirementRepository definitionsRequirement;
  private final CentralSubprocessRequirementScopeRepository centralScopesRequirement;
  private final LocalSubprocessRequirementScopeRepository endpointsRequirement;
  private final LocalRequirementHierarchy hierarchy;
  private final CurrentUserProvider currentUser;
  private final ObjectMapper mapper;
  private final Clock clock;

  public LocalRequirementControlCoverageService(LocalCommandRules rules, RevisionMutationGuard mutationGuard,
      MasterDataRevisionCoordinator revisions, LocalOrganizationSubprocessScopeRepository contexts,
      LocalSubprocessRequirementControlCoverageRepository rows, OrganizationRepository organizations, CentralSubprocessRepository subprocesses,
      CentralSubprocessRequirementControlCoverageRepository centralReferences,
      CentralControlRepository definitionsControl,
      CentralSubprocessControlScopeRepository centralScopesControl, LocalSubprocessControlScopeRepository endpointsControl,
      CentralRegulationRequirementRepository definitionsRequirement,
      CentralSubprocessRequirementScopeRepository centralScopesRequirement, LocalSubprocessRequirementScopeRepository endpointsRequirement, CurrentUserProvider currentUser,
      ObjectMapper mapper, LocalRequirementHierarchy hierarchy,
      @Qualifier("masterDataRevisionClock") Clock clock) {
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
    this.definitionsRequirement = definitionsRequirement;
    this.centralScopesRequirement = centralScopesRequirement;
    this.endpointsRequirement = endpointsRequirement;
    this.hierarchy = hierarchy;
    this.currentUser = currentUser;
    this.mapper = mapper;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public LocalRequirementControlCoverageDtos.Page list(UUID contextId, UUID expectedOrganizationId,
      MasterDataLifecycleStatus status, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "GOVERNANCE", "CONTROL");
    var pageable = rules.pageable(page, size, sort, direction);
    var context = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    rules.assertOwner(expectedOrganizationId, context.getOrganizationId());
    var result = rows.findByOrganizationSubprocessScopeIdAndStatusIn(contextId,
        rules.statuses(status), pageable);
    return new LocalRequirementControlCoverageDtos.Page(result.getContent().stream().map(this::map).toList(),
        page, size, result.getTotalElements(), result.getTotalPages());
  }

  @Transactional(readOnly = true)
  public LocalRequirementControlCoverageDtos.Row detail(UUID contextId, UUID id, UUID expectedOrganizationId) {
    rules.requireView("PROCESS", "GOVERNANCE", "CONTROL");
    var row = rows.findById(id).orElseThrow(() -> rules.notFound(id));
    if (!row.getOrganizationSubprocessScopeId().equals(contextId)) throw rules.notFound(id);
    var context = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    rules.assertOwner(expectedOrganizationId, context.getOrganizationId());
    return map(row);
  }

  @Transactional
  public LocalRequirementControlCoverageDtos.Mutation create(UUID contextId, UUID expectedOrganizationId, LocalRequirementControlCoverageDtos.Create request) {
    rules.requireWrite("PROCESS", "GOVERNANCE", "CONTROL");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    var owner = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    UUID orgId = owner.getOrganizationId();
    rules.assertOwner(expectedOrganizationId, orgId);
    AtomicReference<LocalRequirementControlCoverageDtos.Row> response = new AtomicReference<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(orgId, "Create Local RequirementControl Coverage", "Local Coverage", null),
        revision -> {
          requireRevision(revision, orgId);
          var locked = lockReferences(orgId, owner.getSubprocessId(), contextId,
              request.localRequirementScopeId(), request.localControlScopeId(), request.centralRequirementControlCoverageId());
          validate(locked, request.sourceType(), request.centralRequirementControlCoverageId(), request.validFrom(),
              request.validTo(), true);
          rows.findByOrganizationSubprocessScopeIdAndLocalRequirementScopeIdAndLocalControlScopeId(
              contextId, request.localRequirementScopeId(), request.localControlScopeId())
              .ifPresent(other -> { throw rules.duplicate(other.getStatus()); });
          var row = rows.saveAndFlush(LocalSubprocessRequirementControlCoverageEntity.create(contextId,
              request.localRequirementScopeId(), request.localControlScopeId(), request.centralRequirementControlCoverageId(),
              request.sourceType(), rules.note(request.coverageNote()),
              request.validFrom(), request.validTo(), actor(), now()));
          response.set(map(row));
          return result(revision, row, RevisionOperationType.CREATE, null, null);
        });
    return mutation(result, response.get());
  }

  @Transactional
  public LocalRequirementControlCoverageDtos.Mutation update(UUID contextId, UUID id, UUID expectedOrganizationId,
      LocalRequirementControlCoverageDtos.Update request) {
    return change(contextId, id, expectedOrganizationId, request.version(), "update", request);
  }

  @Transactional
  public LocalRequirementControlCoverageDtos.Version lifecycle(UUID contextId, UUID id, UUID expectedOrganizationId,
      Long version, String action) {
    return new LocalRequirementControlCoverageDtos.Version(change(contextId, id, expectedOrganizationId, version, action, null)
        .version());
  }

  private LocalRequirementControlCoverageDtos.Mutation change(UUID contextId, UUID id, UUID expectedOrganizationId,
      Long expectedVersion, String action, LocalRequirementControlCoverageDtos.Update update) {
    rules.requireWrite("PROCESS", "GOVERNANCE", "CONTROL");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    var owner = rows.findById(id).orElseThrow(() -> rules.notFound(id));
    if (!owner.getOrganizationSubprocessScopeId().equals(contextId)) throw rules.notFound(id);
    var contextOwner = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    UUID orgId = contextOwner.getOrganizationId();
    rules.assertOwner(expectedOrganizationId, orgId);
    AtomicReference<LocalRequirementControlCoverageDtos.Row> response = new AtomicReference<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(orgId, action + " Local RequirementControl Coverage", "Local Coverage", null),
        revision -> {
          requireRevision(revision, orgId);
          var locked = lockReferences(orgId, contextOwner.getSubprocessId(), contextId,
              owner.getLocalRequirementScopeId(), owner.getLocalControlScopeId(), owner.getCentralRequirementControlCoverageId());
          var row = rows.lockById(id).orElseThrow(() -> rules.notFound(id));
          rules.assertVersion(row.getVersion(), expectedVersion);
          JsonNode before = snapshot(row);
          RevisionOperationType operation;
          if (update != null) {
            rules.nonDeleted(row.getStatus());
            validate(locked, row.getSourceType(), row.getCentralRequirementControlCoverageId(),
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
                validate(locked, row.getSourceType(), row.getCentralRequirementControlCoverageId(),
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
      LocalSubprocessRequirementScopeEntity endpointRequirement, LocalSubprocessControlScopeEntity endpointControl,
      CentralRegulationRequirementEntity definitionRequirement, CentralControlEntity definitionControl,
      CentralSubprocessRequirementScopeEntity centralScopeRequirement, CentralSubprocessControlScopeEntity centralScopeControl,
      CentralSubprocessRequirementControlCoverageEntity central) {}

  private Locked lockReferences(UUID orgId, UUID subprocessId, UUID contextId,
      UUID leftId, UUID rightId, UUID centralId) {
    // Immutable FK hints are read only after all hierarchy Guards. Mutable state is
    // validated exclusively from the subsequent locked rows.
    var hintControl = endpointsControl.findById(rightId)
        .orElseThrow(() -> rules.referenceNotFound(rightId));
    var hintRequirement = endpointsRequirement.findById(leftId)
        .orElseThrow(() -> rules.referenceNotFound(leftId));
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
    var definitionRequirement = definitionsRequirement.lockById(hintRequirement.getRequirementId())
        .orElseThrow(() -> rules.referenceNotFound(hintRequirement.getRequirementId()));
    var centralScopeRequirement = centralHint == null ? null
        : centralScopesRequirement.lockById(centralHint.getRequirementScopeId())
            .orElseThrow(() -> rules.referenceNotFound(centralHint.getRequirementScopeId()));
    var central = centralId == null ? null : centralReferences.lockById(centralId)
        .orElseThrow(() -> rules.referenceNotFound(centralId));
    var context = contexts.lockById(contextId).orElseThrow(() -> rules.notFound(contextId));
    var endpointControl = endpointsControl.lockById(rightId)
        .orElseThrow(() -> rules.referenceNotFound(rightId));
    var endpointRequirement = endpointsRequirement.lockById(leftId)
        .orElseThrow(() -> rules.referenceNotFound(leftId));
    if (!context.getOrganizationId().equals(orgId)
        || !context.getSubprocessId().equals(subprocessId)
        || !endpointRequirement.getOrganizationSubprocessScopeId().equals(contextId)
        || !endpointControl.getOrganizationSubprocessScopeId().equals(contextId)) {
      throw rules.invalid("CROSS_LOCAL_CONTEXT_COVERAGE", "Coverage endpoints cross Context");
    }
    return new Locked(org, subprocess, context, endpointRequirement, endpointControl, definitionRequirement, definitionControl, centralScopeRequirement, centralScopeControl, central);
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
    if (active) rules.active(locked.endpointRequirement.getStatus());
    else rules.nonDeleted(locked.endpointRequirement.getStatus());
    if (active) rules.active(locked.definitionRequirement.getStatus());
    else rules.nonDeleted(locked.definitionRequirement.getStatus());
    if (locked.central != null) {
      if (!locked.central.getSubprocessId().equals(locked.context.getSubprocessId())) {
        throw rules.invalid("LOCAL_INHERITED_REFERENCE_MISMATCH", "Central Coverage Subprocess mismatch");
      }
      if (!locked.centralScopeRequirement.getRequirementId().equals(locked.endpointRequirement.getRequirementId())
          || !locked.centralScopeRequirement.getSubprocessId().equals(locked.context.getSubprocessId())
          || !locked.central.getRequirementScopeId().equals(locked.centralScopeRequirement.getId())) {
        throw rules.invalid("LOCAL_INHERITED_REFERENCE_MISMATCH", "Central Coverage endpoint mismatch");
      }
      if (active) rules.active(locked.centralScopeRequirement.getStatus());
      else rules.nonDeleted(locked.centralScopeRequirement.getStatus());
      if (!locked.centralScopeControl.getControlId().equals(locked.endpointControl.getControlId())
          || !locked.centralScopeControl.getSubprocessId().equals(locked.context.getSubprocessId())
          || !locked.central.getControlScopeId().equals(locked.centralScopeControl.getId())) {
        throw rules.invalid("LOCAL_INHERITED_REFERENCE_MISMATCH", "Central Coverage endpoint mismatch");
      }
      if (active) rules.active(locked.centralScopeControl.getStatus());
      else rules.nonDeleted(locked.centralScopeControl.getStatus());
      if (active) rules.active(locked.central.getStatus());
      else rules.nonDeleted(locked.central.getStatus());
      if (!rules.contained(from, to, locked.central.getValidFrom(), locked.central.getValidTo())) {
        throw rules.invalid("LOCAL_VALIDITY_OUTSIDE_CENTRAL_VALIDITY",
            "Local interval exceeds Central Coverage");
      }
    }
  }

  private RevisionOperationResult result(RevisionExecutionContext revision, LocalSubprocessRequirementControlCoverageEntity row,
      RevisionOperationType operation, Long expected, JsonNode before) {
    var content = RevisionContentResult.completed(RevisionEntityType.LOCAL_SUBPROCESS_REQUIREMENT_CONTROL_COVERAGE,
        row.getId(), operation, expected, before, snapshot(row), row.getVersion(),
        mapper.valueToTree(Map.of("validated", true)));
    return RevisionOperationResult.completed(revision,
        new MasterDataMutationResult(row.getId(), revision.revisionId(), row.getVersion()),
        List.of(content));
  }

  private LocalRequirementControlCoverageDtos.Mutation mutation(RevisionExecutionResult result, LocalRequirementControlCoverageDtos.Row row) {
    var primary = result.primaryResult();
    return new LocalRequirementControlCoverageDtos.Mutation(primary.entityId(), primary.version(), primary.revisionId(), row);
  }

  private void requireRevision(RevisionExecutionContext revision, UUID orgId) {
    mutationGuard.requireDomain(revision, RevisionDomain.LOCAL);
    mutationGuard.requireOrganization(revision, orgId);
    KEYS.forEach(key -> mutationGuard.requireHierarchyGuard(revision, key));
  }

  private JsonNode snapshot(LocalSubprocessRequirementControlCoverageEntity row) { return mapper.valueToTree(row); }

  private LocalRequirementControlCoverageDtos.Row map(LocalSubprocessRequirementControlCoverageEntity row) {
    var context = contexts.findById(row.getOrganizationSubprocessScopeId())
        .orElseThrow(() -> rules.notFound(row.getOrganizationSubprocessScopeId()));
    var org = organizations.findById(context.getOrganizationId())
        .orElseThrow(() -> rules.referenceNotFound(context.getOrganizationId()));
    var subprocess = subprocesses.findById(context.getSubprocessId())
        .orElseThrow(() -> rules.referenceNotFound(context.getSubprocessId()));
    var left = endpointsRequirement.findById(row.getLocalRequirementScopeId())
        .orElseThrow(() -> rules.referenceNotFound(row.getLocalRequirementScopeId()));
    var right = endpointsControl.findById(row.getLocalControlScopeId())
        .orElseThrow(() -> rules.referenceNotFound(row.getLocalControlScopeId()));
    var leftDefinition = definitionsRequirement.findById(left.getRequirementId())
        .orElseThrow(() -> rules.referenceNotFound(left.getRequirementId()));
    var labels = hierarchy.labels(left.getRequirementId());
    var rightDefinition = definitionsControl.findById(right.getControlId())
        .orElseThrow(() -> rules.referenceNotFound(right.getControlId()));
    var central = row.getCentralRequirementControlCoverageId() == null ? null
        : centralReferences.findById(row.getCentralRequirementControlCoverageId())
            .orElseThrow(() -> rules.referenceNotFound(row.getCentralRequirementControlCoverageId()));
    return new LocalRequirementControlCoverageDtos.Row(row.getId(), context.getOrganizationId(), org.getCode(),
        org.getName(), context.getId(), context.getSubprocessId(), subprocess.getCode(),
        subprocess.getTitle(), context.getStatus(), left.getId(), left.getStatus(),
        left.getRequirementId(), leftDefinition.getCode(), leftDefinition.getTitle(),
        labels.regulationId(), labels.regulationCode(), labels.regulationLabel(),
        labels.regulationGroupId(), labels.regulationGroupCode(), labels.regulationGroupLabel(),
        right.getId(), right.getStatus(), right.getControlId(),
        rightDefinition.getCode(), rightDefinition.getTitle(), row.getCentralRequirementControlCoverageId(),
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
