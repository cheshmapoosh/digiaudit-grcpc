package com.digiaudit.grcpc.modules.masterdata.local.application;

import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository.CentralPolicyRepository;

import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalContextPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.local.domain.LocalScopeAction;
import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.*;
import com.digiaudit.grcpc.modules.masterdata.local.domain.repository.*;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.*;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.*;
import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationEntity;
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
public class LocalContextPolicyService {
  private static final List<MasterDataHierarchyKey> KEYS = List.of(MasterDataHierarchyKey.ORGANIZATION, MasterDataHierarchyKey.POLICY, MasterDataHierarchyKey.PROCESS);
  private final LocalCommandRules rules;
  private final RevisionMutationGuard mutationGuard;
  private final MasterDataRevisionCoordinator revisions;
  private final LocalPolicySubprocessScopeRepository rows;
  private final LocalOrganizationSubprocessScopeRepository contexts;
  private final OrganizationRepository organizations;
  private final CentralSubprocessRepository subprocesses;
  private final CentralPolicyRepository policies;

  private final CurrentUserProvider currentUser;
  private final ObjectMapper mapper;
  private final Clock clock;

  public LocalContextPolicyService(LocalCommandRules rules, RevisionMutationGuard mutationGuard,
      MasterDataRevisionCoordinator revisions, LocalPolicySubprocessScopeRepository rows,
      LocalOrganizationSubprocessScopeRepository contexts, OrganizationRepository organizations,
      CentralSubprocessRepository subprocesses, CentralPolicyRepository policies,
       CurrentUserProvider currentUser, ObjectMapper mapper,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.rules = rules;
    this.mutationGuard = mutationGuard;
    this.revisions = revisions;
    this.rows = rows;
    this.contexts = contexts;
    this.organizations = organizations;
    this.subprocesses = subprocesses;
    this.policies = policies;

    this.currentUser = currentUser;
    this.mapper = mapper;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public LocalContextPolicyDtos.Page list(UUID targetId, UUID expectedOrganizationId,
      MasterDataLifecycleStatus status, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "GOVERNANCE");
    var pageable = rules.pageable(page, size, sort, direction);
    var owner = ownership(targetId);
    rules.assertOwner(expectedOrganizationId, owner.organizationId());
    var result = rows.findByOrganizationSubprocessScopeIdAndStatusIn(targetId, rules.statuses(status), pageable);
    return new LocalContextPolicyDtos.Page(result.getContent().stream().map(this::map).toList(),
        page, size, result.getTotalElements(), result.getTotalPages());
  }

  @Transactional(readOnly = true)
  public LocalContextPolicyDtos.Row detail(UUID targetId, UUID id, UUID expectedOrganizationId) {
    rules.requireView("PROCESS", "GOVERNANCE");
    var row = rows.findById(id).orElseThrow(() -> rules.notFound(id));
    if (!row.getOrganizationSubprocessScopeId().equals(targetId)) throw rules.notFound(id);
    var owner = ownership(targetId);
    rules.assertOwner(expectedOrganizationId, owner.organizationId());
    return map(row);
  }

  @Transactional
  public LocalContextPolicyDtos.Mutation create(UUID targetId, UUID expectedOrganizationId, LocalContextPolicyDtos.Create request) {
    rules.requireWrite("PROCESS", "GOVERNANCE");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    var owner = ownership(targetId);
    rules.assertOwner(expectedOrganizationId, owner.organizationId());
    AtomicReference<LocalContextPolicyDtos.Row> response = new AtomicReference<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(owner.organizationId(), "Create Local Context Policy",
            "Local Policy", null),
        revision -> {
          requireRevision(revision, owner.organizationId());
          var locked = lockOwned(owner, targetId, request.policyId());
          validate(locked, request.scopeAction(), request.validFrom(), request.validTo(), true);
          rows.findByOrganizationSubprocessScopeIdAndPolicyId(targetId, request.policyId())
              .ifPresent(other -> { throw rules.duplicate(other.getStatus()); });
          var row = rows.saveAndFlush(LocalPolicySubprocessScopeEntity.create(targetId, request.policyId(),
              request.scopeAction(), request.validFrom(), request.validTo(), actor(), now()));
          response.set(map(row));
          return result(revision, row, RevisionOperationType.CREATE, null, null);
        });
    return mutation(result, response.get());
  }

  @Transactional
  public LocalContextPolicyDtos.Mutation update(UUID targetId, UUID id, UUID expectedOrganizationId,
      LocalContextPolicyDtos.Update request) {
    return change(targetId, id, expectedOrganizationId, request.version(), "update", request);
  }

  @Transactional
  public LocalContextPolicyDtos.Version lifecycle(UUID targetId, UUID id, UUID expectedOrganizationId,
      Long version, String action) {
    return new LocalContextPolicyDtos.Version(change(targetId, id, expectedOrganizationId, version, action, null)
        .version());
  }

  private LocalContextPolicyDtos.Mutation change(UUID targetId, UUID id, UUID expectedOrganizationId,
      Long expectedVersion, String action, LocalContextPolicyDtos.Update update) {
    rules.requireWrite("PROCESS", "GOVERNANCE");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    var ownerRow = rows.findById(id).orElseThrow(() -> rules.notFound(id));
    if (!ownerRow.getOrganizationSubprocessScopeId().equals(targetId)) throw rules.notFound(id);
    var owner = ownership(targetId);
    rules.assertOwner(expectedOrganizationId, owner.organizationId());
    AtomicReference<LocalContextPolicyDtos.Row> response = new AtomicReference<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(owner.organizationId(), action + " Local Context Policy",
            "Local Policy", null),
        revision -> {
          requireRevision(revision, owner.organizationId());
          var locked = lockOwned(owner, targetId, ownerRow.getPolicyId());
          var row = rows.lockById(id).orElseThrow(() -> rules.notFound(id));
          rules.assertVersion(row.getVersion(), expectedVersion);
          JsonNode before = snapshot(row);
          RevisionOperationType operation;
          if (update != null) {
            rules.nonDeleted(row.getStatus());
            validate(locked, update.scopeAction(), update.validFrom(), update.validTo(), false);
            row.update(update.scopeAction(), update.validFrom(), update.validTo(), actor(), now());
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
                validate(locked, row.getScopeAction(), row.getValidFrom(), row.getValidTo(), true);
                if (operation == RevisionOperationType.ACTIVATE) row.activate(actor(), now());
                else row.restore(actor(), now());
              }
              case INACTIVATE -> row.inactivate(actor(), now());
              case DELETE -> row.delete(actor(), now());
              default -> throw new IllegalStateException("Unexpected Local Policy operation");
            }
          }
          var saved = rows.saveAndFlush(row);
          response.set(map(saved));
          return result(revision, saved, operation, expectedVersion, before);
        });
    return mutation(result, response.get());
  }

  private record Ownership(UUID organizationId, UUID subprocessId, UUID contextId,
      UUID definitionId) {}

  private Ownership ownership(UUID targetId) {
    var context = contexts.findById(targetId).orElseThrow(() -> rules.notFound(targetId));
    return new Ownership(context.getOrganizationId(), context.getSubprocessId(),
        context.getId(), null);
  }

  private record Locked(OrganizationEntity org, CentralPolicyEntity policy,
      CentralSubprocessEntity subprocess, LocalOrganizationSubprocessScopeEntity context) {}

  private Locked lockOwned(Ownership owner, UUID targetId, UUID policyId) {
    var org = organizations.lockById(owner.organizationId())
        .orElseThrow(() -> rules.referenceNotFound(owner.organizationId()));
    var policy = policies.lockById(policyId)
        .orElseThrow(() -> rules.referenceNotFound(policyId));
    var subprocess = subprocesses.lockById(owner.subprocessId())
        .orElseThrow(() -> rules.referenceNotFound(owner.subprocessId()));

    var context = contexts.lockById(owner.contextId())
        .orElseThrow(() -> rules.notFound(owner.contextId()));

    if (!context.getOrganizationId().equals(owner.organizationId())
        || !context.getSubprocessId().equals(owner.subprocessId())) {
      throw rules.notFound(targetId);
    }
    return new Locked(org, policy, subprocess, context);
  }

  private void validate(Locked locked, LocalScopeAction action, LocalDate from, LocalDate to,
      boolean active) {
    if (action == null) throw rules.bad("Policy action is required");
    rules.dates(from, to);
    if (active) {
      rules.active(locked.org.getStatus());
      rules.active(locked.policy.getStatus());
      rules.active(locked.subprocess.getStatus());
      rules.active(locked.context.getStatus());
    } else {
      rules.nonDeleted(locked.org.getStatus());
      rules.nonDeleted(locked.policy.getStatus());
      rules.nonDeleted(locked.subprocess.getStatus());
      rules.nonDeleted(locked.context.getStatus());
    }

    if (!rules.contained(from, to, locked.policy.getValidFrom(), locked.policy.getValidTo())
        || !rules.contained(from, to, locked.context.getValidFrom(),
            locked.context.getValidTo())) {
      throw rules.invalid("LOCAL_POLICY_VALIDITY_OUTSIDE_ENDPOINTS",
          "Policy interval exceeds Policy or exact Local target");
    }
  }

  private RevisionOperationResult result(RevisionExecutionContext revision, LocalPolicySubprocessScopeEntity row,
      RevisionOperationType operation, Long expected, JsonNode before) {
    var content = RevisionContentResult.completed(RevisionEntityType.LOCAL_POLICY_SUBPROCESS_SCOPE,
        row.getId(), operation, expected, before, snapshot(row), row.getVersion(),
        mapper.valueToTree(Map.of("validated", true)));
    return RevisionOperationResult.completed(revision,
        new MasterDataMutationResult(row.getId(), revision.revisionId(), row.getVersion()),
        List.of(content));
  }

  private LocalContextPolicyDtos.Mutation mutation(RevisionExecutionResult result, LocalContextPolicyDtos.Row row) {
    var primary = result.primaryResult();
    return new LocalContextPolicyDtos.Mutation(primary.entityId(), primary.version(), primary.revisionId(), row);
  }

  private void requireRevision(RevisionExecutionContext revision, UUID orgId) {
    mutationGuard.requireDomain(revision, RevisionDomain.LOCAL);
    mutationGuard.requireOrganization(revision, orgId);
    KEYS.forEach(key -> mutationGuard.requireHierarchyGuard(revision, key));
  }

  private JsonNode snapshot(LocalPolicySubprocessScopeEntity row) { return mapper.valueToTree(row); }

  private LocalContextPolicyDtos.Row map(LocalPolicySubprocessScopeEntity row) {
    var context = contexts.findById(row.getOrganizationSubprocessScopeId())
        .orElseThrow(() -> rules.notFound(row.getOrganizationSubprocessScopeId()));
    var org = organizations.findById(context.getOrganizationId())
        .orElseThrow(() -> rules.referenceNotFound(context.getOrganizationId()));
    var subprocess = subprocesses.findById(context.getSubprocessId())
        .orElseThrow(() -> rules.referenceNotFound(context.getSubprocessId()));
    var policy = policies.findById(row.getPolicyId())
        .orElseThrow(() -> rules.referenceNotFound(row.getPolicyId()));
    return new LocalContextPolicyDtos.Row(row.getId(), context.getOrganizationId(), org.getCode(),
        org.getName(), context.getId(), context.getSubprocessId(),
        subprocess.getCode(), subprocess.getTitle(), context.getStatus(), row.getPolicyId(), policy.getCode(),
        policy.getTitle(), row.getScopeAction(), row.getStatus(), row.getValidFrom(),
        row.getValidTo(), row.getVersion(), row.getCreatedAt(), row.getCreatedBy(),
        row.getUpdatedAt(), row.getUpdatedBy(), row.getDeletedAt(), row.getDeletedBy());
  }

  private UUID actor() { return currentUser.getCurrentPrincipal().getUserId(); }
  private Instant now() { return Instant.now(clock); }
}

