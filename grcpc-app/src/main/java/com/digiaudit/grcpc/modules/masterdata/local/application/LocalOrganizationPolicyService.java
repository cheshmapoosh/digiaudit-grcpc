package com.digiaudit.grcpc.modules.masterdata.local.application;

import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository.CentralPolicyRepository;
import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalOrganizationPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.local.domain.LocalPropagationMode;
import com.digiaudit.grcpc.modules.masterdata.local.domain.LocalScopeAction;
import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.LocalPolicyOrganizationScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.local.domain.repository.LocalPolicyOrganizationScopeRepository;
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
public class LocalOrganizationPolicyService {
  private static final List<MasterDataHierarchyKey> KEYS = List.of(
      MasterDataHierarchyKey.ORGANIZATION, MasterDataHierarchyKey.POLICY);
  private final LocalCommandRules rules;
  private final RevisionMutationGuard mutationGuard;
  private final MasterDataRevisionCoordinator revisions;
  private final LocalPolicyOrganizationScopeRepository rows;
  private final OrganizationRepository organizations;
  private final CentralPolicyRepository policies;
  private final CurrentUserProvider currentUser;
  private final ObjectMapper mapper;
  private final Clock clock;

  public LocalOrganizationPolicyService(LocalCommandRules rules,
      RevisionMutationGuard mutationGuard, MasterDataRevisionCoordinator revisions,
      LocalPolicyOrganizationScopeRepository rows, OrganizationRepository organizations,
      CentralPolicyRepository policies, CurrentUserProvider currentUser,
      ObjectMapper mapper, @Qualifier("masterDataRevisionClock") Clock clock) {
    this.rules = rules;
    this.mutationGuard = mutationGuard;
    this.revisions = revisions;
    this.rows = rows;
    this.organizations = organizations;
    this.policies = policies;
    this.currentUser = currentUser;
    this.mapper = mapper;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public LocalOrganizationPolicyDtos.Page list(UUID organizationId,
      MasterDataLifecycleStatus status, int page, int size, String sort, String direction) {
    rules.requireView("GOVERNANCE");
    var pageable = rules.pageable(page, size, sort, direction);
    if (!organizations.existsById(organizationId)) throw rules.referenceNotFound(organizationId);
    var result = rows.findByOrganizationIdAndStatusIn(
        organizationId, rules.statuses(status), pageable);
    return new LocalOrganizationPolicyDtos.Page(
        result.getContent().stream().map(this::map).toList(),
        page, size, result.getTotalElements(), result.getTotalPages());
  }

  @Transactional(readOnly = true)
  public LocalOrganizationPolicyDtos.Row detail(UUID id, UUID expectedOrganizationId) {
    rules.requireView("GOVERNANCE");
    var row = rows.findById(id).orElseThrow(() -> rules.notFound(id));
    rules.assertOwner(expectedOrganizationId, row.getOrganizationId());
    return map(row);
  }

  @Transactional
  public LocalOrganizationPolicyDtos.Mutation create(LocalOrganizationPolicyDtos.Create request) {
    rules.requireWrite("GOVERNANCE");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    UUID orgId = request.organizationId();
    AtomicReference<LocalOrganizationPolicyDtos.Row> response = new AtomicReference<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(orgId, "Create Local Organization Policy", "Local Policy", null),
        revision -> {
          requireRevision(revision, orgId);
          var org = organizations.lockById(orgId)
              .orElseThrow(() -> rules.referenceNotFound(orgId));
          var policy = policies.lockById(request.policyId())
              .orElseThrow(() -> rules.referenceNotFound(request.policyId()));
          validate(org, policy, request.scopeAction(), request.propagationMode(),
              request.validFrom(), request.validTo(), true);
          rows.findByOrganizationIdAndPolicyId(orgId, request.policyId())
              .ifPresent(other -> { throw rules.duplicate(other.getStatus()); });
          var row = rows.saveAndFlush(LocalPolicyOrganizationScopeEntity.create(orgId,
              request.policyId(), request.scopeAction(), request.propagationMode(),
              request.validFrom(), request.validTo(), actor(), now()));
          response.set(map(row));
          return result(revision, row, RevisionOperationType.CREATE, null, null);
        });
    return mutation(result, response.get());
  }

  @Transactional
  public LocalOrganizationPolicyDtos.Mutation update(UUID id, UUID expectedOrganizationId,
      LocalOrganizationPolicyDtos.Update request) {
    return change(id, expectedOrganizationId, request.version(), "update", request);
  }

  @Transactional
  public LocalOrganizationPolicyDtos.Version lifecycle(UUID id, UUID expectedOrganizationId,
      Long version, String action) {
    return new LocalOrganizationPolicyDtos.Version(
        change(id, expectedOrganizationId, version, action, null).version());
  }

  private LocalOrganizationPolicyDtos.Mutation change(UUID id, UUID expectedOrganizationId,
      Long expectedVersion, String action, LocalOrganizationPolicyDtos.Update update) {
    rules.requireWrite("GOVERNANCE");
    rules.lock(KEYS.toArray(MasterDataHierarchyKey[]::new));
    var owner = rows.findById(id).orElseThrow(() -> rules.notFound(id));
    UUID orgId = owner.getOrganizationId();
    rules.assertOwner(expectedOrganizationId, orgId);
    AtomicReference<LocalOrganizationPolicyDtos.Row> response = new AtomicReference<>();
    var result = revisions.executeStructural(KEYS,
        RevisionRequest.local(orgId, action + " Local Organization Policy", "Local Policy", null),
        revision -> {
          requireRevision(revision, orgId);
          var org = organizations.lockById(orgId)
              .orElseThrow(() -> rules.referenceNotFound(orgId));
          var policy = policies.lockById(owner.getPolicyId())
              .orElseThrow(() -> rules.referenceNotFound(owner.getPolicyId()));
          var row = rows.lockById(id).orElseThrow(() -> rules.notFound(id));
          rules.assertVersion(row.getVersion(), expectedVersion);
          JsonNode before = snapshot(row);
          RevisionOperationType operation;
          if (update != null) {
            rules.nonDeleted(row.getStatus());
            validate(org, policy, update.scopeAction(), update.propagationMode(),
                update.validFrom(), update.validTo(), false);
            row.update(update.scopeAction(), update.propagationMode(),
                update.validFrom(), update.validTo(), actor(), now());
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
                validate(org, policy, row.getScopeAction(), row.getPropagationMode(),
                    row.getValidFrom(), row.getValidTo(), true);
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

  private void validate(OrganizationEntity org, CentralPolicyEntity policy,
      LocalScopeAction action, LocalPropagationMode mode, LocalDate from, LocalDate to,
      boolean active) {
    if (action == null || mode == null) throw rules.bad("Policy action and mode are required");
    rules.dates(from, to);
    if (active) {
      rules.active(org.getStatus());
      rules.active(policy.getStatus());
    } else {
      rules.nonDeleted(org.getStatus());
      rules.nonDeleted(policy.getStatus());
    }
    if (!rules.contained(from, to, org.getValidFrom(), org.getValidTo())
        || !rules.contained(from, to, policy.getValidFrom(), policy.getValidTo())) {
      throw rules.invalid("LOCAL_POLICY_VALIDITY_OUTSIDE_ENDPOINTS",
          "Policy interval exceeds Organization or Policy");
    }
  }

  private RevisionOperationResult result(RevisionExecutionContext revision,
      LocalPolicyOrganizationScopeEntity row, RevisionOperationType operation,
      Long expected, JsonNode before) {
    var content = RevisionContentResult.completed(RevisionEntityType.LOCAL_POLICY_ORGANIZATION_SCOPE,
        row.getId(), operation, expected, before, snapshot(row), row.getVersion(),
        mapper.valueToTree(Map.of("validated", true)));
    return RevisionOperationResult.completed(revision,
        new MasterDataMutationResult(row.getId(), revision.revisionId(), row.getVersion()),
        List.of(content));
  }

  private LocalOrganizationPolicyDtos.Mutation mutation(RevisionExecutionResult result,
      LocalOrganizationPolicyDtos.Row row) {
    var primary = result.primaryResult();
    return new LocalOrganizationPolicyDtos.Mutation(primary.entityId(), primary.version(),
        primary.revisionId(), row);
  }

  private void requireRevision(RevisionExecutionContext revision, UUID orgId) {
    mutationGuard.requireDomain(revision, RevisionDomain.LOCAL);
    mutationGuard.requireOrganization(revision, orgId);
    KEYS.forEach(key -> mutationGuard.requireHierarchyGuard(revision, key));
  }

  private JsonNode snapshot(LocalPolicyOrganizationScopeEntity row) {
    return mapper.valueToTree(row);
  }

  private LocalOrganizationPolicyDtos.Row map(LocalPolicyOrganizationScopeEntity row) {
    var org = organizations.findById(row.getOrganizationId())
        .orElseThrow(() -> rules.referenceNotFound(row.getOrganizationId()));
    var policy = policies.findById(row.getPolicyId())
        .orElseThrow(() -> rules.referenceNotFound(row.getPolicyId()));
    return new LocalOrganizationPolicyDtos.Row(row.getId(), row.getOrganizationId(),
        org.getCode(), org.getName(), row.getPolicyId(), policy.getCode(),
        policy.getTitle(), row.getScopeAction(), row.getPropagationMode(),
        row.getStatus(), row.getValidFrom(), row.getValidTo(), row.getVersion(),
        row.getCreatedAt(), row.getCreatedBy(), row.getUpdatedAt(), row.getUpdatedBy(),
        row.getDeletedAt(), row.getDeletedBy());
  }

  private UUID actor() { return currentUser.getCurrentPrincipal().getUserId(); }
  private Instant now() { return Instant.now(clock); }
}
