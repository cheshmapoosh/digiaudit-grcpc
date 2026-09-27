package com.digiaudit.grcpc.modules.masterdata.local.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalRiskDtos;
import com.digiaudit.grcpc.modules.masterdata.local.domain.LocalSourceType;
import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.*;
import com.digiaudit.grcpc.modules.masterdata.local.domain.repository.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.repository.CentralRiskTemplateRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.domain.entity.CentralSubprocessRiskScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.domain.repository.CentralSubprocessRiskScopeRepository;
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
public class LocalRiskService {
  private static final List<MasterDataHierarchyKey> KEYS = List.of(MasterDataHierarchyKey.ORGANIZATION, MasterDataHierarchyKey.PROCESS, MasterDataHierarchyKey.RISK);
  private final LocalCommandRules rules;
  private final RevisionMutationGuard mutationGuard;
  private final MasterDataRevisionCoordinator revisions;
  private final LocalOrganizationSubprocessScopeRepository contexts;
  private final LocalSubprocessRiskScopeRepository rows;
  private final OrganizationRepository organizations;
  private final CentralSubprocessRepository subprocesses;
  private final CentralRiskTemplateRepository definitions;
  private final CentralSubprocessRiskScopeRepository centralReferences;
  private final LocalSubprocessRiskControlCoverageRepository dependent0;
  private final LocalSubprocessRiskControlObjectiveCoverageRepository dependent1;
  private final CurrentUserProvider currentUser;
  private final ObjectMapper mapper;
  private final Clock clock;

  public LocalRiskService(LocalCommandRules rules, RevisionMutationGuard mutationGuard,
      MasterDataRevisionCoordinator revisions, LocalOrganizationSubprocessScopeRepository contexts,
      LocalSubprocessRiskScopeRepository rows, OrganizationRepository organizations,
      CentralSubprocessRepository subprocesses, CentralRiskTemplateRepository definitions,
      CentralSubprocessRiskScopeRepository centralReferences,
      LocalSubprocessRiskControlCoverageRepository dependent0, LocalSubprocessRiskControlObjectiveCoverageRepository dependent1, CurrentUserProvider currentUser,
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
  public LocalRiskDtos.Page list(UUID contextId, UUID expectedOrganizationId,
      MasterDataLifecycleStatus status, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "RISK");
    var pageable = rules.pageable(page, size, sort, direction);
    var context = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    rules.assertOwner(expectedOrganizationId, context.getOrganizationId());
    var result = rows.findByOrganizationSubprocessScopeIdAndStatusIn(
        contextId, rules.statuses(status), pageable);
    return new LocalRiskDtos.Page(result.getContent().stream().map(this::map).toList(),
        page, size, result.getTotalElements(), result.getTotalPages());
  }

  @Transactional(readOnly = true)
  public LocalRiskDtos.Row detail(UUID contextId, UUID id, UUID expectedOrganizationId) {
    rules.requireView("PROCESS", "RISK");
    var row = rows.findById(id).orElseThrow(() -> rules.notFound(id));
    if (!row.getOrganizationSubprocessScopeId().equals(contextId)) throw rules.notFound(id);
    var context = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    rules.assertOwner(expectedOrganizationId, context.getOrganizationId());
    return map(row);
  }

  @Transactional
  public LocalRiskDtos.Mutation create(UUID contextId, UUID expectedOrganizationId, LocalRiskDtos.Create request) {
    rules.requireWrite("PROCESS", "RISK");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    var owner = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    UUID orgId = owner.getOrganizationId();
    rules.assertOwner(expectedOrganizationId, orgId);
    AtomicReference<LocalRiskDtos.Row> response = new AtomicReference<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(orgId, "Create Local Risk Scope", "Local Risk Scope", null),
        revision -> {
          requireRevision(revision, orgId);
          var org = organizations.lockById(orgId)
              .orElseThrow(() -> rules.referenceNotFound(orgId));
          var subprocess = subprocesses.lockById(owner.getSubprocessId())
              .orElseThrow(() -> rules.referenceNotFound(owner.getSubprocessId()));
          var definition = definitions.lockById(request.riskTemplateId())
              .orElseThrow(() -> rules.referenceNotFound(request.riskTemplateId()));
          var central = request.centralRiskScopeId() == null ? null
              : centralReferences.lockById(request.centralRiskScopeId())
                  .orElseThrow(() -> rules.referenceNotFound(request.centralRiskScopeId()));
          var context = contexts.lockById(contextId).orElseThrow(() -> rules.notFound(contextId));
          rules.active(org.getStatus());
          rules.active(subprocess.getStatus());
          rules.active(context.getStatus());
          rules.active(definition.getStatus());
          validateSource(request.sourceType(), request.centralRiskScopeId(), request.riskTemplateId(),
              context.getSubprocessId(), request.validFrom(), request.validTo(), central, true);
          rows.findByOrganizationSubprocessScopeIdAndRiskTemplateId(contextId, request.riskTemplateId())
              .ifPresent(other -> { throw rules.duplicate(other.getStatus()); });
          var row = rows.saveAndFlush(LocalSubprocessRiskScopeEntity.create(contextId, request.riskTemplateId(),
              request.centralRiskScopeId(), request.sourceType(), request.validFrom(), request.validTo(),
              actor(), now()));
          response.set(map(row));
          return result(revision, row, RevisionOperationType.CREATE, null, null);
        });
    return mutation(result, response.get());
  }

  @Transactional
  public LocalRiskDtos.Mutation update(UUID contextId, UUID id, UUID expectedOrganizationId,
      LocalRiskDtos.Update request) {
    return change(contextId, id, expectedOrganizationId, request.version(), "update", request);
  }

  @Transactional
  public LocalRiskDtos.Version lifecycle(UUID contextId, UUID id, UUID expectedOrganizationId,
      Long version, String action) {
    return new LocalRiskDtos.Version(change(contextId, id, expectedOrganizationId, version, action, null)
        .version());
  }

  private LocalRiskDtos.Mutation change(UUID contextId, UUID id, UUID expectedOrganizationId,
      Long expectedVersion, String action, LocalRiskDtos.Update update) {
    rules.requireWrite("PROCESS", "RISK");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    var owner = rows.findById(id).orElseThrow(() -> rules.notFound(id));
    if (!owner.getOrganizationSubprocessScopeId().equals(contextId)) throw rules.notFound(id);
    var contextOwner = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    UUID orgId = contextOwner.getOrganizationId();
    rules.assertOwner(expectedOrganizationId, orgId);
    AtomicReference<LocalRiskDtos.Row> response = new AtomicReference<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(orgId, action + " Local Risk Scope", "Local Risk Scope", null),
        revision -> {
          requireRevision(revision, orgId);
          var org = organizations.lockById(orgId).orElseThrow(() -> rules.referenceNotFound(orgId));
          var subprocess = subprocesses.lockById(contextOwner.getSubprocessId())
              .orElseThrow(() -> rules.referenceNotFound(contextOwner.getSubprocessId()));
          var definition = definitions.lockById(owner.getRiskTemplateId())
              .orElseThrow(() -> rules.referenceNotFound(owner.getRiskTemplateId()));
          var central = owner.getCentralRiskScopeId() == null ? null
              : centralReferences.lockById(owner.getCentralRiskScopeId())
                  .orElseThrow(() -> rules.referenceNotFound(owner.getCentralRiskScopeId()));
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
            validateSource(row.getSourceType(), row.getCentralRiskScopeId(), row.getRiskTemplateId(),
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
                validateSource(row.getSourceType(), row.getCentralRiskScopeId(), row.getRiskTemplateId(),
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
      CentralSubprocessRiskScopeEntity central, boolean active) {
    rules.dates(from, to);
    if (sourceType == null ||
        (sourceType == LocalSourceType.INHERITED_FROM_CENTRAL) != (centralReferenceId != null)) {
      throw rules.invalid("LOCAL_INHERITED_REFERENCE_MISMATCH", "Central Scope reference shape is invalid");
    }
    if (central != null) {
      if (!central.getRiskTemplateId().equals(definitionId)
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
    if (dependent0.existsByLocalRiskScopeIdAndStatusNot(id, deleted)
        || dependent1.existsByLocalRiskScopeIdAndStatusNot(id, deleted)) {
      throw new ConflictException("LOCAL_DEPENDENCY_EXISTS",
          "error.masterdata.v2.dependencyExists", "Local Scope has live children", id);
    }
  }

  private RevisionOperationResult result(RevisionExecutionContext revision, LocalSubprocessRiskScopeEntity row,
      RevisionOperationType operation, Long expected, JsonNode before) {
    var content = RevisionContentResult.completed(RevisionEntityType.LOCAL_SUBPROCESS_RISK_SCOPE, row.getId(), operation,
        expected, before, snapshot(row), row.getVersion(),
        mapper.valueToTree(Map.of("validated", true)));
    return RevisionOperationResult.completed(revision,
        new MasterDataMutationResult(row.getId(), revision.revisionId(), row.getVersion()),
        List.of(content));
  }

  private LocalRiskDtos.Mutation mutation(RevisionExecutionResult result, LocalRiskDtos.Row row) {
    var primary = result.primaryResult();
    return new LocalRiskDtos.Mutation(primary.entityId(), primary.version(), primary.revisionId(), row);
  }

  private void requireRevision(RevisionExecutionContext revision, UUID orgId) {
    mutationGuard.requireDomain(revision, RevisionDomain.LOCAL);
    mutationGuard.requireOrganization(revision, orgId);
    KEYS.forEach(key -> mutationGuard.requireHierarchyGuard(revision, key));
  }

  private JsonNode snapshot(LocalSubprocessRiskScopeEntity row) { return mapper.valueToTree(row); }

  private LocalRiskDtos.Row map(LocalSubprocessRiskScopeEntity row) {
    var context = contexts.findById(row.getOrganizationSubprocessScopeId())
        .orElseThrow(() -> rules.notFound(row.getOrganizationSubprocessScopeId()));
    var org = organizations.findById(context.getOrganizationId())
        .orElseThrow(() -> rules.referenceNotFound(context.getOrganizationId()));
    var subprocess = subprocesses.findById(context.getSubprocessId())
        .orElseThrow(() -> rules.referenceNotFound(context.getSubprocessId()));
    var definition = definitions.findById(row.getRiskTemplateId())
        .orElseThrow(() -> rules.referenceNotFound(row.getRiskTemplateId()));
    var central = row.getCentralRiskScopeId() == null ? null
        : centralReferences.findById(row.getCentralRiskScopeId())
            .orElseThrow(() -> rules.referenceNotFound(row.getCentralRiskScopeId()));
    return new LocalRiskDtos.Row(row.getId(), context.getOrganizationId(), org.getCode(),
        org.getName(), context.getId(), context.getSubprocessId(), subprocess.getCode(),
        subprocess.getTitle(), context.getStatus(), row.getRiskTemplateId(),
        definition.getCode(), definition.getTitle(), row.getCentralRiskScopeId(),
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

