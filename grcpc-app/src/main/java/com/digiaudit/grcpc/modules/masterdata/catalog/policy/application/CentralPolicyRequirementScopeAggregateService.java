package com.digiaudit.grcpc.modules.masterdata.catalog.policy.application;

import com.digiaudit.grcpc.common.exception.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyRequirementScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository.CentralPolicyRequirementScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.*;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.*;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.repository.CentralSubprocessRequirementScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.entity.CentralSubprocessRequirementScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRequirementRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class CentralPolicyRequirementScopeAggregateService {
  private final CentralPolicyRequirementScopeRepository relations;
  private final CentralSubprocessRequirementScopeRepository endpoints;
  private final CentralSubprocessRepository subprocesses;
  private final CentralRegulationRequirementRepository requirements;
  private final RevisionMutationGuard guard;
  private final MasterDataAuthorizationService authorization;
  private final ObjectMapper json;
  private final MasterDataRevisionActorProvider actors;
  private final Clock clock;

  public CentralPolicyRequirementScopeAggregateService(CentralPolicyRequirementScopeRepository relations,
      CentralSubprocessRequirementScopeRepository endpoints, CentralSubprocessRepository subprocesses, CentralRegulationRequirementRepository requirements,
      RevisionMutationGuard guard, MasterDataAuthorizationService authorization,
      ObjectMapper json, MasterDataRevisionActorProvider actors,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.relations = relations; this.endpoints = endpoints;
    this.subprocesses = subprocesses; this.requirements = requirements;
    this.guard = guard; this.authorization = authorization;
    this.json = json; this.actors = actors; this.clock = clock;
  }

  public Prepared prepare(RevisionExecutionContext context, UUID policyId,
      MasterDataLifecycleStatus ownerStatus, LocalDate ownerFrom, LocalDate ownerTo,
      List<CentralPolicyDtos.PolicyRequirementScopeChange> requested) {
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.POLICY);
    List<CentralPolicyDtos.PolicyRequirementScopeChange> changes = requested == null ? List.of() : new ArrayList<>(requested);
    if (!changes.isEmpty()) {
      guard.requireHierarchyGuard(context, MasterDataHierarchyKey.PROCESS);
      guard.requireHierarchyGuard(context, MasterDataHierarchyKey.REGULATION);
    }
    if (!changes.isEmpty()) { if (!authorization.canManage("GOVERNANCE") || !authorization.canView("PROCESS"))
      throw new ForbiddenException("MASTER_DATA_ACCESS_DENIED", "error.security.forbidden", "Policy relation access denied"); }
    Set<UUID> seen = new HashSet<>();
    for (var change : changes) {
      if (change == null || change.operation() == null || change.centralRequirementScopeId() == null
          || !seen.add(change.centralRequirementScopeId()))
        throw invalid("Invalid or repeated Policy Requirement relation change");
    }
    changes.sort(Comparator.comparing(CentralPolicyDtos.PolicyRequirementScopeChange::centralRequirementScopeId));
    Map<UUID, Endpoint> lockedEndpoints = new HashMap<>();
    for (var change : changes) lockedEndpoints.put(change.centralRequirementScopeId(), lockEndpoint(change.centralRequirementScopeId()));
    Map<UUID, CentralPolicyRequirementScopeEntity> existing = new HashMap<>();
    for (var row : relations.lockAllByPolicyId(policyId)) existing.put(row.getCentralRequirementScopeId(), row);
    List<Mutation> prepared = new ArrayList<>();
    for (var change : changes) {
      CentralPolicyRequirementScopeEntity row = existing.get(change.centralRequirementScopeId());
      var operation = change.operation();
      if (operation == CentralPolicyDtos.PolicyScopeChangeOperation.CREATE_OR_RESTORE) {
        if (change.relationId() != null || change.version() != null || change.requestedStatus() != null)
          throw invalid("CREATE_OR_RESTORE has invalid fields");
      } else {
        if (row == null || !row.getId().equals(change.relationId()))
          throw new NotFoundException("POLICY_RELATION_NOT_FOUND", "error.masterdata.v2.notFound",
              "Policy relation not found");
        if (change.version() == null || change.version() < 0 || row.getVersion() != change.version())
          throw new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict",
              "Policy relation changed", row.getId());
      }
      if (operation != CentralPolicyDtos.PolicyScopeChangeOperation.UPDATE
          && operation != CentralPolicyDtos.PolicyScopeChangeOperation.CREATE_OR_RESTORE
          && (change.validFrom() != null || change.validTo() != null || change.requestedStatus() != null))
        throw invalid("Lifecycle change cannot alter validity or requestedStatus");
      if (operation == CentralPolicyDtos.PolicyScopeChangeOperation.UPDATE
          && change.requestedStatus() == MasterDataLifecycleStatus.DELETED)
        throw invalid("UPDATE requestedStatus must be ACTIVE or INACTIVE");
      LocalDate from = operation == CentralPolicyDtos.PolicyScopeChangeOperation.UPDATE
          || operation == CentralPolicyDtos.PolicyScopeChangeOperation.CREATE_OR_RESTORE
          ? change.validFrom() : row.getValidFrom();
      LocalDate to = operation == CentralPolicyDtos.PolicyScopeChangeOperation.UPDATE
          || operation == CentralPolicyDtos.PolicyScopeChangeOperation.CREATE_OR_RESTORE
          ? change.validTo() : row.getValidTo();
      if (from != null && to != null && from.isAfter(to)) throw invalid("Invalid relation validity interval");
      if (operation != CentralPolicyDtos.PolicyScopeChangeOperation.DELETE) {
        if (!subset(from, to, ownerFrom, ownerTo)
            || !subset(from, to, lockedEndpoints.get(change.centralRequirementScopeId()).from(),
                lockedEndpoints.get(change.centralRequirementScopeId()).to()))
          throw invalid("Policy relation validity exceeds an endpoint");
      }
      RevisionOperationType revisionOp;
      if (operation == CentralPolicyDtos.PolicyScopeChangeOperation.CREATE_OR_RESTORE) {
        requireActive(ownerStatus, lockedEndpoints.get(change.centralRequirementScopeId()));
        if (row == null) {
          row = CentralPolicyRequirementScopeEntity.create(policyId, change.centralRequirementScopeId(), from, to, actors.currentActorId(), Instant.now(clock));
          revisionOp = RevisionOperationType.CREATE;
        } else if (row.getStatus() == MasterDataLifecycleStatus.DELETED) revisionOp = RevisionOperationType.RESTORE;
        else if (row.getStatus() == MasterDataLifecycleStatus.INACTIVE) revisionOp = RevisionOperationType.ACTIVATE;
        else throw new ConflictException("DUPLICATE_RELATION", "error.masterdata.v2.duplicateBusinessKey",
            "Policy relation is already active");
      } else {
        revisionOp = switch (operation) {
          case UPDATE -> RevisionOperationType.UPDATE;
          case ACTIVATE -> RevisionOperationType.ACTIVATE;
          case INACTIVATE -> RevisionOperationType.INACTIVATE;
          case DELETE -> RevisionOperationType.DELETE;
          case RESTORE -> RevisionOperationType.RESTORE;
          default -> throw invalid("Invalid operation");
        };
        if (operation == CentralPolicyDtos.PolicyScopeChangeOperation.UPDATE) {
          if (row.getStatus() == MasterDataLifecycleStatus.DELETED) throw invalid("Deleted relation cannot be edited");
          if (change.requestedStatus() == MasterDataLifecycleStatus.ACTIVE) requireActive(ownerStatus, lockedEndpoints.get(change.centralRequirementScopeId()));
        } else if (operation == CentralPolicyDtos.PolicyScopeChangeOperation.ACTIVATE
            || operation == CentralPolicyDtos.PolicyScopeChangeOperation.RESTORE) requireActive(ownerStatus, lockedEndpoints.get(change.centralRequirementScopeId()));
        if ((operation == CentralPolicyDtos.PolicyScopeChangeOperation.ACTIVATE
                && row.getStatus() != MasterDataLifecycleStatus.INACTIVE)
            || (operation == CentralPolicyDtos.PolicyScopeChangeOperation.INACTIVATE
                && row.getStatus() != MasterDataLifecycleStatus.ACTIVE)
            || (operation == CentralPolicyDtos.PolicyScopeChangeOperation.RESTORE
                && row.getStatus() != MasterDataLifecycleStatus.DELETED)
            || (operation == CentralPolicyDtos.PolicyScopeChangeOperation.DELETE
                && row.getStatus() == MasterDataLifecycleStatus.DELETED))
          throw invalid("Invalid relation lifecycle transition");
      }
      prepared.add(new Mutation(row, revisionOp,
          revisionOp == RevisionOperationType.CREATE ? null : row.getVersion(),
          revisionOp == RevisionOperationType.CREATE ? null : snapshot(row), from, to,
          change.requestedStatus()));
    }
    for (var row : existing.values()) {
      if (row.getStatus() == MasterDataLifecycleStatus.DELETED || seen.contains(row.getCentralRequirementScopeId())) continue;
      if (!subset(row.getValidFrom(), row.getValidTo(), ownerFrom, ownerTo))
        throw invalid("Retained Policy relation exceeds final Policy validity");
    }
    return new Prepared(policyId, prepared);
  }

  public List<RevisionContentResult> apply(Prepared prepared, UUID policyId) {
    if (!prepared.policyId().equals(policyId)) throw new IllegalStateException("Wrong Policy relation owner");
    List<RevisionContentResult> contents = new ArrayList<>();
    for (var mutation : prepared.mutations()) {
      var row = mutation.row();
      UUID actor = actors.currentActorId();
      Instant now = Instant.now(clock);
      switch (mutation.operation()) {
        case CREATE -> {}
        case UPDATE -> {
          row.update(mutation.from(), mutation.to(), actor, now);
          if (mutation.requestedStatus() == MasterDataLifecycleStatus.ACTIVE
              && row.getStatus() == MasterDataLifecycleStatus.INACTIVE) row.activate(actor, now);
          if (mutation.requestedStatus() == MasterDataLifecycleStatus.INACTIVE
              && row.getStatus() == MasterDataLifecycleStatus.ACTIVE) row.inactivate(actor, now);
        }
        case ACTIVATE -> { row.update(mutation.from(), mutation.to(), actor, now); row.activate(actor, now); }
        case INACTIVATE -> row.inactivate(actor, now);
        case DELETE -> row.delete(actor, now);
        case RESTORE -> { row.restore(actor, now); row.update(mutation.from(), mutation.to(), actor, now); }
      }
      var saved = relations.saveAndFlush(row);
      contents.add(RevisionContentResult.completed(RevisionEntityType.CENTRAL_POLICY_REQUIREMENT_SCOPE,
          saved.getId(), mutation.operation(), mutation.expected(), mutation.before(),
          snapshot(saved), saved.getVersion(), json.valueToTree(Map.of("validated", true))));
    }
    return contents;
  }

  private Endpoint lockEndpoint(UUID endpointId) {
    var scope = endpoints.lockById(endpointId).orElseThrow(() -> missing(endpointId));
    var subprocess = subprocesses.lockById(scope.getSubprocessId()).orElseThrow(() -> missing(endpointId));
    var requirement = requirements.lockById(scope.getRequirementId()).orElseThrow(() -> missing(endpointId));
    boolean eligible = scope.getStatus() == MasterDataLifecycleStatus.ACTIVE
        && subprocess.getStatus() == MasterDataLifecycleStatus.ACTIVE
        && requirement.getStatus() == MasterDataLifecycleStatus.ACTIVE
        && subset(scope.getValidFrom(), scope.getValidTo(), subprocess.getValidFrom(), subprocess.getValidTo())
        && subset(scope.getValidFrom(), scope.getValidTo(), requirement.getValidFrom(), requirement.getValidTo());
    return new Endpoint(scope.getStatus(), scope.getValidFrom(), scope.getValidTo(), eligible);
  }
  private void requireActive(MasterDataLifecycleStatus ownerStatus, Endpoint endpoint) {
    if (ownerStatus != MasterDataLifecycleStatus.ACTIVE
        || !endpoint.eligible())
      throw invalid("Policy relation endpoints must be active");
  }
  private boolean subset(LocalDate from, LocalDate to, LocalDate parentFrom, LocalDate parentTo) {
    return (parentFrom == null || (from != null && !from.isBefore(parentFrom)))
        && (parentTo == null || (to != null && !to.isAfter(parentTo)));
  }
  private JsonNode snapshot(CentralPolicyRequirementScopeEntity row) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("id", row.getId()); values.put("policyId", row.getPolicyId());
    values.put("centralRequirementScopeId", row.getCentralRequirementScopeId());
    values.put("status", row.getStatus().wireValue());
    values.put("validFrom", row.getValidFrom()); values.put("validTo", row.getValidTo());
    values.put("version", row.getVersion());
    values.put("createdAt", row.getCreatedAt()); values.put("createdBy", row.getCreatedBy());
    values.put("updatedAt", row.getUpdatedAt()); values.put("updatedBy", row.getUpdatedBy());
    values.put("deletedAt", row.getDeletedAt()); values.put("deletedBy", row.getDeletedBy());
    return json.valueToTree(values);
  }
  private NotFoundException missing(UUID id) {
    return new NotFoundException("POLICY_ENDPOINT_NOT_FOUND", "error.masterdata.v2.notFound",
        "Policy relation endpoint not found", id);
  }
  private UnprocessableEntityException invalid(String message) {
    return new UnprocessableEntityException("POLICY_RELATION_INVALID",
        "error.masterdata.v2.invalidRelation", message);
  }
  private record Endpoint(MasterDataLifecycleStatus status, LocalDate from, LocalDate to, boolean eligible) {}
  private record Mutation(CentralPolicyRequirementScopeEntity row, RevisionOperationType operation, Long expected,
      JsonNode before, LocalDate from, LocalDate to, MasterDataLifecycleStatus requestedStatus) {}
  public record Prepared(UUID policyId, List<Mutation> mutations) {
    public Prepared { mutations = List.copyOf(mutations); }
  }
}
