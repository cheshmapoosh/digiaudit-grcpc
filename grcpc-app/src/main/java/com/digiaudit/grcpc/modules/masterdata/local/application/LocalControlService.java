package com.digiaudit.grcpc.modules.masterdata.local.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlAutomationType;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlOperationFrequency;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlTestingTechnique;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalControlDtos;
import com.digiaudit.grcpc.modules.masterdata.local.domain.LocalSourceType;
import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.*;
import com.digiaudit.grcpc.modules.masterdata.local.domain.repository.*;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.*;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.entity.CentralSubprocessControlScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.repository.CentralSubprocessControlScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.*;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationRepository;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.AppUserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LocalControlService {
  private static final List<MasterDataHierarchyKey> KEYS = List.of(
      MasterDataHierarchyKey.CONTROL, MasterDataHierarchyKey.ORGANIZATION,
      MasterDataHierarchyKey.PROCESS);
  private final LocalCommandRules rules;
  private final RevisionMutationGuard mutationGuard;
  private final MasterDataRevisionCoordinator revisions;
  private final LocalOrganizationSubprocessScopeRepository contexts;
  private final LocalSubprocessControlScopeRepository rows;
  private final LocalSubprocessRiskControlCoverageRepository riskControl;
  private final LocalSubprocessControlControlObjectiveCoverageRepository controlObjective;
  private final LocalSubprocessRequirementControlCoverageRepository requirementControl;
  private final LocalPolicyControlScopeRepository policies;
  private final OrganizationRepository organizations;
  private final CentralSubprocessRepository subprocesses;
  private final CentralControlRepository definitions;
  private final CentralSubprocessControlScopeRepository centralReferences;
  private final AppUserRepository users;
  private final CurrentUserProvider currentUser;
  private final ObjectMapper mapper;
  private final Clock clock;

  public LocalControlService(LocalCommandRules rules, RevisionMutationGuard mutationGuard,
      MasterDataRevisionCoordinator revisions, LocalOrganizationSubprocessScopeRepository contexts,
      LocalSubprocessControlScopeRepository rows,
      LocalSubprocessRiskControlCoverageRepository riskControl,
      LocalSubprocessControlControlObjectiveCoverageRepository controlObjective,
      LocalSubprocessRequirementControlCoverageRepository requirementControl,
      LocalPolicyControlScopeRepository policies, OrganizationRepository organizations,
      CentralSubprocessRepository subprocesses, CentralControlRepository definitions,
      CentralSubprocessControlScopeRepository centralReferences, AppUserRepository users,
      CurrentUserProvider currentUser, ObjectMapper mapper,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.rules = rules;
    this.mutationGuard = mutationGuard;
    this.revisions = revisions;
    this.contexts = contexts;
    this.rows = rows;
    this.riskControl = riskControl;
    this.controlObjective = controlObjective;
    this.requirementControl = requirementControl;
    this.policies = policies;
    this.organizations = organizations;
    this.subprocesses = subprocesses;
    this.definitions = definitions;
    this.centralReferences = centralReferences;
    this.users = users;
    this.currentUser = currentUser;
    this.mapper = mapper;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public LocalControlDtos.Page list(UUID contextId, UUID expectedOrganizationId,
      MasterDataLifecycleStatus status, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "CONTROL");
    var pageable = rules.pageable(page, size, sort, direction);
    var context = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    rules.assertOwner(expectedOrganizationId, context.getOrganizationId());
    var result = rows.findByOrganizationSubprocessScopeIdAndStatusIn(
        contextId, rules.statuses(status), pageable);
    return new LocalControlDtos.Page(result.getContent().stream().map(this::map).toList(),
        page, size, result.getTotalElements(), result.getTotalPages());
  }

  @Transactional(readOnly = true)
  public LocalControlDtos.Row detail(UUID contextId, UUID id, UUID expectedOrganizationId) {
    rules.requireView("PROCESS", "CONTROL");
    var row = rows.findById(id).orElseThrow(() -> rules.notFound(id));
    if (!row.getOrganizationSubprocessScopeId().equals(contextId)) throw rules.notFound(id);
    var context = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    rules.assertOwner(expectedOrganizationId, context.getOrganizationId());
    return map(row);
  }

  @Transactional
  public LocalControlDtos.Mutation create(UUID contextId, UUID expectedOrganizationId,
      LocalControlDtos.Create request) {
    rules.requireWrite("PROCESS", "CONTROL");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    var owner = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    UUID orgId = owner.getOrganizationId();
    rules.assertOwner(expectedOrganizationId, orgId);
    AtomicReference<LocalControlDtos.Row> response = new AtomicReference<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(orgId, "Create Local Control", "Local Control Scope", null),
        revision -> {
          requireRevision(revision, orgId);
          var org = organizations.lockById(orgId)
              .orElseThrow(() -> rules.referenceNotFound(orgId));
          var subprocess = subprocesses.lockById(owner.getSubprocessId())
              .orElseThrow(() -> rules.referenceNotFound(owner.getSubprocessId()));
          var definition = definitions.lockById(request.controlId())
              .orElseThrow(() -> rules.referenceNotFound(request.controlId()));
          var central = exactReference(request);
          var context = contexts.lockById(contextId).orElseThrow(() -> rules.notFound(contextId));
          rules.active(org.getStatus());
          rules.active(subprocess.getStatus());
          rules.active(definition.getStatus());
          rules.active(context.getStatus());
          validateCreate(request, context.getSubprocessId(), definition, central);
          if (request.actualOwnerId() != null) validateOwner(request.actualOwnerId());
          rows.findByOrganizationSubprocessScopeIdAndControlId(contextId, request.controlId())
              .ifPresent(other -> { throw rules.duplicate(other.getStatus()); });
          var row = saveNew(context.getId(), request, central);
          response.set(map(row));
          return completed(revision, row, RevisionOperationType.CREATE, null, null);
        });
    return mutation(result, response.get());
  }

  @Transactional
  public LocalControlDtos.AssignmentMutation assign(LocalControlDtos.Assignment request) {
    rules.requireWrite("PROCESS", "CONTROL");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    AtomicReference<LocalOrganizationSubprocessScopeEntity> savedContext = new AtomicReference<>();
    AtomicReference<Boolean> created = new AtomicReference<>(false);
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(request.organizationId(), "Assign Control to Organization",
            "Local Control assignment", null),
        revision -> {
          requireRevision(revision, request.organizationId());
          var org = organizations.lockById(request.organizationId())
              .orElseThrow(() -> rules.referenceNotFound(request.organizationId()));
          var subprocess = subprocesses.lockById(request.subprocessId())
              .orElseThrow(() -> rules.referenceNotFound(request.subprocessId()));
          var definition = definitions.lockById(request.controlId())
              .orElseThrow(() -> rules.referenceNotFound(request.controlId()));
          var central = exactReference(request.control());
          rules.active(org.getStatus());
          rules.active(subprocess.getStatus());
          rules.active(definition.getStatus());
          validateCreate(request.control(), request.subprocessId(), definition, central);
          var found = contexts.findByOrganizationIdAndSubprocessId(
              request.organizationId(), request.subprocessId());
          LocalOrganizationSubprocessScopeEntity context = found.isEmpty() ? null
              : contexts.lockById(found.get().getId())
                  .orElseThrow(() -> rules.notFound(found.get().getId()));
          if (context != null && context.getStatus() != MasterDataLifecycleStatus.ACTIVE) {
            boolean deleted = context.getStatus() == MasterDataLifecycleStatus.DELETED;
            throw new ConflictException(deleted ? "LOCAL_CONTEXT_DELETED" : "LOCAL_CONTEXT_INACTIVE",
                "error.masterdata.local." + (deleted ? "LOCAL_CONTEXT_DELETED" : "LOCAL_CONTEXT_INACTIVE"),
                "Context requires explicit lifecycle action");
          }
          if (context != null) {
            rows.findByOrganizationSubprocessScopeIdAndControlId(context.getId(), request.controlId())
                .ifPresent(other -> { throw rules.duplicate(other.getStatus()); });
          }
          // Validate the final target and owner before the first source write.
          if (request.actualOwnerId() != null) validateOwner(request.actualOwnerId());
          if (context == null) {
            context = contexts.saveAndFlush(LocalOrganizationSubprocessScopeEntity.create(
                request.organizationId(), request.subprocessId(), null,
                request.validFrom(), request.validTo(), actor(), now()));
            created.set(true);
          }
          savedContext.set(context);
          var contents = new ArrayList<RevisionContentResult>();
          if (created.get()) {
            contents.add(content(RevisionEntityType.LOCAL_ORGANIZATION_SUBPROCESS_SCOPE,
                context.getId(), RevisionOperationType.CREATE, null, null, snapshot(context),
                context.getVersion()));
          }
          var row = saveNew(context.getId(), request.control(), central);
          contents.add(content(RevisionEntityType.LOCAL_SUBPROCESS_CONTROL_SCOPE,
              row.getId(), RevisionOperationType.CREATE, null, null, snapshot(row),
              row.getVersion()));
          return RevisionOperationResult.completed(revision,
              new MasterDataMutationResult(row.getId(), revision.revisionId(), row.getVersion()),
              contents);
        });
    var primary = result.primaryResult();
    return new LocalControlDtos.AssignmentMutation(primary.revisionId(),
        request.organizationId(), savedContext.get().getId(), savedContext.get().getVersion(),
        primary.entityId(), primary.version(), created.get());
  }

  @Transactional
  public LocalControlDtos.Mutation update(UUID contextId, UUID id,
      UUID expectedOrganizationId, LocalControlDtos.Update request) {
    return change(contextId, id, expectedOrganizationId, request.version(), "update", request);
  }

  @Transactional
  public LocalControlDtos.Version lifecycle(UUID contextId, UUID id,
      UUID expectedOrganizationId, Long version, String action) {
    return new LocalControlDtos.Version(change(contextId, id, expectedOrganizationId,
        version, action, null).version());
  }

  private LocalControlDtos.Mutation change(UUID contextId, UUID id,
      UUID expectedOrganizationId, Long expectedVersion, String action,
      LocalControlDtos.Update update) {
    rules.requireWrite("PROCESS", "CONTROL");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    var owner = rows.findById(id).orElseThrow(() -> rules.notFound(id));
    if (!owner.getOrganizationSubprocessScopeId().equals(contextId)) throw rules.notFound(id);
    var contextOwner = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    UUID orgId = contextOwner.getOrganizationId();
    rules.assertOwner(expectedOrganizationId, orgId);
    AtomicReference<LocalControlDtos.Row> response = new AtomicReference<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(orgId, action + " Local Control", "Local Control Scope", null),
        revision -> {
          requireRevision(revision, orgId);
          var org = organizations.lockById(orgId).orElseThrow(() -> rules.referenceNotFound(orgId));
          var subprocess = subprocesses.lockById(contextOwner.getSubprocessId())
              .orElseThrow(() -> rules.referenceNotFound(contextOwner.getSubprocessId()));
          var definition = definitions.lockById(owner.getControlId())
              .orElseThrow(() -> rules.referenceNotFound(owner.getControlId()));
          var central = owner.getCentralControlScopeId() == null ? null
              : centralReferences.lockById(owner.getCentralControlScopeId())
                  .orElseThrow(() -> rules.referenceNotFound(owner.getCentralControlScopeId()));
          var context = contexts.lockById(contextId).orElseThrow(() -> rules.notFound(contextId));
          var row = rows.lockById(id).orElseThrow(() -> rules.notFound(id));
          rules.assertVersion(row.getVersion(), expectedVersion);
          JsonNode before = snapshot(row);
          RevisionOperationType operation;
          if (update != null) {
            rules.nonDeleted(row.getStatus());
            rules.nonDeleted(org.getStatus());
            rules.nonDeleted(subprocess.getStatus());
            rules.nonDeleted(definition.getStatus());
            rules.nonDeleted(context.getStatus());
            if (central != null) rules.nonDeleted(central.getStatus());
            validateRetained(row, context.getSubprocessId(), central,
                update.validFrom(), update.validTo(), false);
            if (update.actualOwnerId() != null) validateOwner(update.actualOwnerId());
            row.update(update.actualOwnerId(),
                normalize(update.frequencyCode(), CentralControlOperationFrequency.class),
                normalize(update.executionMethodCode(), CentralControlAutomationType.class),
                normalize(update.testMethodCode(), CentralControlTestingTechnique.class),
                rules.note(update.localContextNote()), update.validFrom(), update.validTo(),
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
                rules.active(definition.getStatus());
                rules.active(context.getStatus());
                validateRetained(row, context.getSubprocessId(), central,
                    row.getValidFrom(), row.getValidTo(), true);
                if (row.getActualOwnerId() != null) validateOwner(row.getActualOwnerId());
                if (operation == RevisionOperationType.ACTIVATE) row.activate(actor(), now());
                else row.restore(actor(), now());
              }
              case INACTIVATE -> row.inactivate(actor(), now());
              case DELETE -> {
                requireNoLiveChildren(id);
                row.delete(actor(), now());
              }
              default -> throw new IllegalStateException("Unexpected Local Control operation");
            }
          }
          var saved = rows.saveAndFlush(row);
          response.set(map(saved));
          return completed(revision, saved, operation, expectedVersion, before);
        });
    return mutation(result, response.get());
  }

  private CentralSubprocessControlScopeEntity exactReference(LocalControlDtos.Create request) {
    if (request.sourceType() == null
        || (request.sourceType() == LocalSourceType.INHERITED_FROM_CENTRAL)
            != (request.centralControlScopeId() != null)) {
      throw rules.invalid("LOCAL_INHERITED_REFERENCE_MISMATCH",
          "Central Control Scope reference shape is invalid");
    }
    return request.centralControlScopeId() == null ? null
        : centralReferences.lockById(request.centralControlScopeId())
            .orElseThrow(() -> rules.referenceNotFound(request.centralControlScopeId()));
  }

  private void validateCreate(LocalControlDtos.Create request, UUID subprocessId,
      CentralControlEntity definition, CentralSubprocessControlScopeEntity central) {
    validateReference(request.sourceType(), request.centralControlScopeId(), definition.getId(),
        subprocessId, request.validFrom(), request.validTo(), central, true);
    normalize(request.frequencyCode(), CentralControlOperationFrequency.class);
    normalize(request.executionMethodCode(), CentralControlAutomationType.class);
    normalize(request.testMethodCode(), CentralControlTestingTechnique.class);
    rules.note(request.localContextNote());
  }

  private void validateRetained(LocalSubprocessControlScopeEntity row, UUID subprocessId,
      CentralSubprocessControlScopeEntity central, LocalDate from, LocalDate to, boolean active) {
    validateReference(row.getSourceType(), row.getCentralControlScopeId(), row.getControlId(),
        subprocessId, from, to, central, active);
  }

  private void validateReference(LocalSourceType source, UUID centralId, UUID controlId,
      UUID subprocessId, LocalDate from, LocalDate to,
      CentralSubprocessControlScopeEntity central, boolean active) {
    rules.dates(from, to);
    if (source == null || (source == LocalSourceType.INHERITED_FROM_CENTRAL)
        != (centralId != null)) {
      throw rules.invalid("LOCAL_INHERITED_REFERENCE_MISMATCH", "Invalid Control source");
    }
    if (central != null) {
      if (!central.getControlId().equals(controlId)
          || !central.getSubprocessId().equals(subprocessId)) {
        throw rules.invalid("LOCAL_INHERITED_REFERENCE_MISMATCH",
            "Central Control Scope does not match");
      }
      if (active) rules.active(central.getStatus());
      else rules.nonDeleted(central.getStatus());
      if (!rules.contained(from, to, central.getValidFrom(), central.getValidTo())) {
        throw rules.invalid("LOCAL_VALIDITY_OUTSIDE_CENTRAL_VALIDITY",
            "Local interval exceeds Central Control Scope");
      }
    }
  }

  private LocalSubprocessControlScopeEntity saveNew(UUID contextId,
      LocalControlDtos.Create request, CentralSubprocessControlScopeEntity central) {
    return rows.saveAndFlush(LocalSubprocessControlScopeEntity.create(contextId,
        request.controlId(), central == null ? null : central.getId(), request.sourceType(),
        request.actualOwnerId(),
        normalize(request.frequencyCode(), CentralControlOperationFrequency.class),
        normalize(request.executionMethodCode(), CentralControlAutomationType.class),
        normalize(request.testMethodCode(), CentralControlTestingTechnique.class),
        rules.note(request.localContextNote()), request.validFrom(), request.validTo(),
        actor(), now()));
  }

  private void validateOwner(UUID ownerId) {
    var owner = users.findByIdForUpdate(ownerId)
        .orElseThrow(() -> rules.invalid("LOCAL_OWNER_NOT_ELIGIBLE", "Owner is unavailable"));
    if (!owner.isEnabled() || owner.isLocked()) {
      throw rules.invalid("LOCAL_OWNER_NOT_ELIGIBLE", "Owner is disabled or locked");
    }
  }

  private <E extends Enum<E>> String normalize(String value, Class<E> type) {
    if (value == null || value.isBlank()) return null;
    String result = value.trim().toUpperCase(Locale.ROOT);
    if (result.length() > 64) {
      throw rules.invalid("LOCAL_CONTROL_CODE_INVALID", "Control execution code is too long");
    }
    try {
      Enum.valueOf(type, result);
      return result;
    } catch (IllegalArgumentException ex) {
      throw rules.invalid("LOCAL_CONTROL_CODE_INVALID", "Unsupported Control execution code");
    }
  }

  private void requireNoLiveChildren(UUID id) {
    var deleted = MasterDataLifecycleStatus.DELETED;
    if (riskControl.existsByLocalControlScopeIdAndStatusNot(id, deleted)
        || controlObjective.existsByLocalControlScopeIdAndStatusNot(id, deleted)
        || requirementControl.existsByLocalControlScopeIdAndStatusNot(id, deleted)
        || policies.existsByLocalControlScopeIdAndStatusNot(id, deleted)) {
      throw new ConflictException("LOCAL_DEPENDENCY_EXISTS",
          "error.masterdata.v2.dependencyExists", "Control Scope has live children", id);
    }
  }

  private RevisionOperationResult completed(RevisionExecutionContext revision,
      LocalSubprocessControlScopeEntity row, RevisionOperationType operation,
      Long expected, JsonNode before) {
    return RevisionOperationResult.completed(revision,
        new MasterDataMutationResult(row.getId(), revision.revisionId(), row.getVersion()),
        List.of(content(RevisionEntityType.LOCAL_SUBPROCESS_CONTROL_SCOPE,
            row.getId(), operation, expected, before, snapshot(row), row.getVersion())));
  }

  private RevisionContentResult content(RevisionEntityType type, UUID id,
      RevisionOperationType operation, Long expected, JsonNode before,
      JsonNode after, long version) {
    return RevisionContentResult.completed(type, id, operation, expected, before,
        after, version, mapper.valueToTree(Map.of("validated", true)));
  }

  private LocalControlDtos.Mutation mutation(RevisionExecutionResult result,
      LocalControlDtos.Row row) {
    var primary = result.primaryResult();
    return new LocalControlDtos.Mutation(primary.entityId(), primary.version(),
        primary.revisionId(), row);
  }

  private void requireRevision(RevisionExecutionContext revision, UUID orgId) {
    mutationGuard.requireDomain(revision, RevisionDomain.LOCAL);
    mutationGuard.requireOrganization(revision, orgId);
    KEYS.forEach(key -> mutationGuard.requireHierarchyGuard(revision, key));
  }

  private JsonNode snapshot(Object row) { return mapper.valueToTree(row); }

  private LocalControlDtos.Row map(LocalSubprocessControlScopeEntity row) {
    var context = contexts.findById(row.getOrganizationSubprocessScopeId())
        .orElseThrow(() -> rules.notFound(row.getOrganizationSubprocessScopeId()));
    var org = organizations.findById(context.getOrganizationId())
        .orElseThrow(() -> rules.referenceNotFound(context.getOrganizationId()));
    var subprocess = subprocesses.findById(context.getSubprocessId())
        .orElseThrow(() -> rules.referenceNotFound(context.getSubprocessId()));
    var definition = definitions.findById(row.getControlId())
        .orElseThrow(() -> rules.referenceNotFound(row.getControlId()));
    var central = row.getCentralControlScopeId() == null ? null
        : centralReferences.findById(row.getCentralControlScopeId())
            .orElseThrow(() -> rules.referenceNotFound(row.getCentralControlScopeId()));
    String ownerLabel = row.getActualOwnerId() == null ? null
        : users.findById(row.getActualOwnerId())
            .map(owner -> (owner.getFirstName() + " " + owner.getLastName()).trim()).orElse(null);
    return new LocalControlDtos.Row(row.getId(), context.getOrganizationId(), org.getCode(),
        org.getName(), context.getId(), context.getSubprocessId(), subprocess.getCode(),
        subprocess.getTitle(), context.getStatus(), row.getControlId(), definition.getCode(),
        definition.getTitle(), row.getCentralControlScopeId(),
        central == null ? null : central.getStatus(),
        central == null ? null : central.getValidFrom(),
        central == null ? null : central.getValidTo(), row.getSourceType(),
        row.getActualOwnerId(), ownerLabel, row.getFrequencyCode(),
        row.getExecutionMethodCode(), row.getTestMethodCode(), row.getLocalContextNote(),
        row.getStatus(), row.getValidFrom(), row.getValidTo(), row.getVersion(),
        row.getCreatedAt(), row.getCreatedBy(), row.getUpdatedAt(), row.getUpdatedBy(),
        row.getDeletedAt(), row.getDeletedBy());
  }

  private UUID actor() { return currentUser.getCurrentPrincipal().getUserId(); }
  private Instant now() { return Instant.now(clock); }
}
