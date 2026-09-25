package com.digiaudit.grcpc.modules.masterdata.catalog.policy.application;

import com.digiaudit.grcpc.common.exception.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicySubprocessScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository.CentralPolicySubprocessScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.*;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.*;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralProcessRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class CentralPolicySubprocessScopeAggregateService {
  private final CentralPolicySubprocessScopeRepository relations;
  private final CentralSubprocessRepository endpoints;
  private final CentralProcessRepository processes;
  
  private final RevisionMutationGuard guard;
  private final MasterDataAuthorizationService authorization;
  private final ObjectMapper json;
  private final MasterDataRevisionActorProvider actors;
  private final Clock clock;

  public CentralPolicySubprocessScopeAggregateService(CentralPolicySubprocessScopeRepository relations,
      CentralSubprocessRepository endpoints, CentralProcessRepository processes,
      RevisionMutationGuard guard, MasterDataAuthorizationService authorization,
      ObjectMapper json, MasterDataRevisionActorProvider actors,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.relations = relations; this.endpoints = endpoints; this.processes = processes;
    
    this.guard = guard; this.authorization = authorization;
    this.json = json; this.actors = actors; this.clock = clock;
  }

  public Prepared prepare(RevisionExecutionContext context, UUID policyId,
      MasterDataLifecycleStatus ownerStatus, LocalDate ownerFrom, LocalDate ownerTo,
      List<CentralPolicyDtos.PolicySubprocessScopeChange> requested) {
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.POLICY);
    List<CentralPolicyDtos.PolicySubprocessScopeChange> changes = requested == null ? List.of() : new ArrayList<>(requested);
    if (!changes.isEmpty()) {
      guard.requireHierarchyGuard(context, MasterDataHierarchyKey.PROCESS);
    }
    if (!changes.isEmpty()) { if (!authorization.canManage("GOVERNANCE") || !authorization.canView("PROCESS"))
      throw new ForbiddenException("MASTER_DATA_ACCESS_DENIED", "error.security.forbidden", "Policy relation access denied"); }
    Set<UUID> seen = new HashSet<>();
    for (var change : changes) {
      if (change == null || change.operation() == null || change.subprocessId() == null
          || !seen.add(change.subprocessId()))
        throw invalid("Invalid or repeated Policy Subprocess relation change");
    }
    changes.sort(Comparator.comparing(CentralPolicyDtos.PolicySubprocessScopeChange::subprocessId));
    Map<UUID, Endpoint> lockedEndpoints = new HashMap<>();
    for (var change : changes) lockedEndpoints.put(change.subprocessId(), lockEndpoint(change.subprocessId()));
    Map<UUID, CentralPolicySubprocessScopeEntity> existing = new HashMap<>();
    for (var row : relations.lockAllByPolicyId(policyId)) existing.put(row.getSubprocessId(), row);
    List<Mutation> prepared = new ArrayList<>();
    for (var change : changes) {
      CentralPolicySubprocessScopeEntity row = existing.get(change.subprocessId());
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
            || !subset(from, to, lockedEndpoints.get(change.subprocessId()).from(),
                lockedEndpoints.get(change.subprocessId()).to()))
          throw invalid("Policy relation validity exceeds an endpoint");
      }
      RevisionOperationType revisionOp;
      if (operation == CentralPolicyDtos.PolicyScopeChangeOperation.CREATE_OR_RESTORE) {
        requireActive(ownerStatus, lockedEndpoints.get(change.subprocessId()));
        if (row == null) {
          row = CentralPolicySubprocessScopeEntity.create(policyId, change.subprocessId(), from, to, actors.currentActorId(), Instant.now(clock));
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
          if (change.requestedStatus() == MasterDataLifecycleStatus.ACTIVE) requireActive(ownerStatus, lockedEndpoints.get(change.subprocessId()));
        } else if (operation == CentralPolicyDtos.PolicyScopeChangeOperation.ACTIVATE
            || operation == CentralPolicyDtos.PolicyScopeChangeOperation.RESTORE) requireActive(ownerStatus, lockedEndpoints.get(change.subprocessId()));
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
      if (row.getStatus() == MasterDataLifecycleStatus.DELETED || seen.contains(row.getSubprocessId())) continue;
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
      contents.add(RevisionContentResult.completed(RevisionEntityType.CENTRAL_POLICY_SUBPROCESS_SCOPE,
          saved.getId(), mutation.operation(), mutation.expected(), mutation.before(),
          snapshot(saved), saved.getVersion(), json.valueToTree(Map.of("validated", true))));
    }
    return contents;
  }

  private Endpoint lockEndpoint(UUID endpointId) {
    var endpoint = endpoints.lockById(endpointId).orElseThrow(() -> missing(endpointId));
    var process = processes.lockById(endpoint.getProcessId()).orElseThrow(() -> missing(endpointId));
    return new Endpoint(endpoint.getStatus(), endpoint.getValidFrom(), endpoint.getValidTo(),
        endpoint.getStatus() == MasterDataLifecycleStatus.ACTIVE
            && process.getStatus() == MasterDataLifecycleStatus.ACTIVE
            && subset(endpoint.getValidFrom(), endpoint.getValidTo(),
                process.getValidFrom(), process.getValidTo()));
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
  private JsonNode snapshot(CentralPolicySubprocessScopeEntity row) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("id", row.getId()); values.put("policyId", row.getPolicyId());
    values.put("subprocessId", row.getSubprocessId());
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
  private record Mutation(CentralPolicySubprocessScopeEntity row, RevisionOperationType operation, Long expected,
      JsonNode before, LocalDate from, LocalDate to, MasterDataLifecycleStatus requestedStatus) {}
  public record Prepared(UUID policyId, List<Mutation> mutations) {
    public Prepared { mutations = List.copyOf(mutations); }
  }
}
