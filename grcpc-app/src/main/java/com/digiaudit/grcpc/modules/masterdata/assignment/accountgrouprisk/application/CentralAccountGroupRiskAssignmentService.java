package com.digiaudit.grcpc.modules.masterdata.assignment.accountgrouprisk.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.assignment.accountgrouprisk.api.dto.AccountGroupRiskAssignmentDtos;
import com.digiaudit.grcpc.modules.masterdata.assignment.accountgrouprisk.domain.entity.CentralAccountGroupRiskAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.assignment.accountgrouprisk.domain.repository.CentralAccountGroupRiskAssignmentRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.entity.CentralAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.repository.CentralAccountGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskTemplateEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.repository.CentralRiskTemplateRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionActorProvider;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionMutationGuard;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionDomain;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CentralAccountGroupRiskAssignmentService {
  private final CentralAccountGroupRiskAssignmentRepository assignments;
  private final CentralAccountGroupRepository accountGroups;
  private final CentralRiskTemplateRepository riskTemplates;
  private final RevisionMutationGuard guard;
  private final MasterDataAuthorizationService authorization;
  private final MasterDataRevisionActorProvider actors;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public CentralAccountGroupRiskAssignmentService(CentralAccountGroupRiskAssignmentRepository assignments,
      CentralAccountGroupRepository accountGroups, CentralRiskTemplateRepository riskTemplates,
      RevisionMutationGuard guard, MasterDataAuthorizationService authorization,
      MasterDataRevisionActorProvider actors, ObjectMapper objectMapper,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.assignments = assignments;
    this.accountGroups = accountGroups;
    this.riskTemplates = riskTemplates;
    this.guard = guard;
    this.authorization = authorization;
    this.actors = actors;
    this.objectMapper = objectMapper;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<AccountGroupRiskAssignmentDtos.Response> forAccountGroup(UUID accountGroupId) {
    accountGroups.findByIdAndStatusNot(accountGroupId, MasterDataLifecycleStatus.DELETED)
        .orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND",
            "error.masterdata.v2.notFound", "Central Account Group not found", accountGroupId));
    var rows = assignments.findByAccountGroupIdAndStatusNot(accountGroupId, MasterDataLifecycleStatus.DELETED);
    var risks = byRiskId(riskTemplates.findAllById(
        rows.stream().map(CentralAccountGroupRiskAssignmentEntity::getRiskTemplateId).toList()));
    return rows.stream().map(row -> {
      var risk = requireRisk(risks, row.getRiskTemplateId());
      return new AccountGroupRiskAssignmentDtos.Response(row.getId(), risk.getId(), risk.getCode(),
          risk.getTitle(), risk.getStatus(), row.getStatus(), row.getValidFrom(), row.getValidTo(), row.getVersion());
    }).sorted(Comparator.comparing(AccountGroupRiskAssignmentDtos.Response::riskTemplateCode)
        .thenComparing(AccountGroupRiskAssignmentDtos.Response::assignmentId)).toList();
  }

  public List<LockedChange> lockEndpoints(RevisionExecutionContext context,
      List<AccountGroupRiskAssignmentDtos.Selection> selections,
      List<AccountGroupRiskAssignmentDtos.LifecycleChange> lifecycleChanges) {
    if ((selections == null || selections.isEmpty())
        && (lifecycleChanges == null || lifecycleChanges.isEmpty())) return List.of();

    authorization.requireManageWithReference("REFERENCE", "RISK");
    requireGuards(context);
    Map<UUID, Change> changes = new TreeMap<>();
    if (selections != null) {
      selections.forEach(selection -> addChange(changes, selection.riskTemplateId(),
          new Change(RevisionOperationType.CREATE, null, selection.version())));
    }
    if (lifecycleChanges != null) {
      lifecycleChanges.forEach(change -> addChange(changes, change.riskTemplateId(),
          new Change(RevisionOperationType.valueOf(change.operation().name()),
              change.assignmentId(), change.version())));
    }
    var risks = byRiskId(riskTemplates.lockAllByIds(List.copyOf(changes.keySet())));
    return changes.entrySet().stream().map(entry -> {
      var risk = requireRisk(risks, entry.getKey());
      var change = entry.getValue();
      if (change.operation() == RevisionOperationType.CREATE && risk.getVersion() != change.version()) {
        throw versionConflict(risk.getId());
      }
      return new LockedChange(risk, change);
    }).toList();
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public List<RevisionContentResult> apply(RevisionExecutionContext context, CentralAccountGroupEntity group,
      List<LockedChange> changes) {
    requireGuards(context);
    var rows = assignments.lockPairs(group.getId(), changes.stream().map(change -> change.risk().getId()).toList())
        .stream().collect(Collectors.toMap(CentralAccountGroupRiskAssignmentEntity::getRiskTemplateId,
            Function.identity()));
    UUID actor = actors.currentActorId();
    Instant now = Instant.now(clock);
    var mutations = new ArrayList<Mutation>();
    for (var change : changes) {
      mutations.add(applyChange(group, change, rows.get(change.risk().getId()), actor, now));
    }
    var saved = assignments.saveAllAndFlush(mutations.stream().map(Mutation::row).toList())
        .stream().collect(Collectors.toMap(CentralAccountGroupRiskAssignmentEntity::getId, Function.identity()));
    var validation = objectMapper.valueToTree(Map.of("validated", true,
        "hierarchyKeys", context.acquiredHierarchyKeys().stream().map(Enum::name).sorted().toList()));
    return mutations.stream().map(mutation -> {
      var row = saved.get(mutation.row().getId());
      return RevisionContentResult.completed(RevisionEntityType.CENTRAL_ACCOUNT_GROUP_RISK_ASSIGNMENT,
          row.getId(), mutation.operation(), mutation.expectedVersion(), mutation.before(), snapshot(row),
          row.getVersion(), validation);
    }).toList();
  }

  private Mutation applyChange(CentralAccountGroupEntity group, LockedChange locked,
      CentralAccountGroupRiskAssignmentEntity row, UUID actor, Instant now) {
    var risk = locked.risk();
    var change = locked.change();
    var operation = change.operation();
    if (operation == RevisionOperationType.CREATE) {
      if (row == null) {
        requireActiveEndpoints(group, risk);
        return new Mutation(CentralAccountGroupRiskAssignmentEntity.create(group.getId(), risk.getId(), actor, now),
            operation, null, null);
      }
      if (row.getStatus() == MasterDataLifecycleStatus.ACTIVE) {
        throw new ConflictException("DUPLICATE_RELATION", "error.masterdata.centralAssignment.duplicate",
            "This Account Group and Risk Template already have an active assignment", group.getId(), risk.getId());
      }
      operation = row.getStatus() == MasterDataLifecycleStatus.DELETED
          ? RevisionOperationType.RESTORE : RevisionOperationType.ACTIVATE;
    } else {
      if (row == null || !row.getId().equals(change.assignmentId())) {
        throw new NotFoundException("CENTRAL_ACCOUNT_GROUP_RISK_ASSIGNMENT_NOT_FOUND",
            "error.masterdata.centralAssignment.notFound", "Account Group Risk Template assignment not found",
            change.assignmentId());
      }
      if (row.getVersion() != change.version()) throw versionConflict(row.getId());
    }
    MasterDataLifecycleStatus next = switch (operation) {
      case ACTIVATE, RESTORE -> {
        requireActiveEndpoints(group, risk);
        requireStatus(row, operation == RevisionOperationType.RESTORE
            ? MasterDataLifecycleStatus.DELETED : MasterDataLifecycleStatus.INACTIVE);
        yield MasterDataLifecycleStatus.ACTIVE;
      }
      case INACTIVATE -> {
        requireStatus(row, MasterDataLifecycleStatus.ACTIVE);
        yield MasterDataLifecycleStatus.INACTIVE;
      }
      case DELETE -> {
        if (row.getStatus() == MasterDataLifecycleStatus.DELETED) throw invalidTransition(row.getId());
        yield MasterDataLifecycleStatus.DELETED;
      }
      default -> throw new IllegalStateException("Unexpected Account Group Risk assignment operation " + operation);
    };
    var mutation = new Mutation(row, operation, row.getVersion(), snapshot(row));
    row.changeStatus(next, actor, now);
    return mutation;
  }

  private void requireGuards(RevisionExecutionContext context) {
    guard.requireDomain(context, RevisionDomain.CENTRAL);
    guard.requireDraft(context);
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.ACCOUNT_GROUP);
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.RISK);
  }

  private static void addChange(Map<UUID, Change> changes, UUID riskId, Change change) {
    if (changes.putIfAbsent(riskId, change) != null) {
      throw new UnprocessableEntityException("ACCOUNT_GROUP_RISK_ASSIGNMENT_CHANGE_INVALID",
          "error.masterdata.centralAssignment.invalidChange", "Duplicate Risk Template in one assignment request");
    }
  }

  private static Map<UUID, CentralRiskTemplateEntity> byRiskId(List<CentralRiskTemplateEntity> risks) {
    return risks.stream().collect(Collectors.toMap(CentralRiskTemplateEntity::getId, Function.identity()));
  }

  private static CentralRiskTemplateEntity requireRisk(Map<UUID, CentralRiskTemplateEntity> risks, UUID riskId) {
    var risk = risks.get(riskId);
    if (risk == null) {
      throw new NotFoundException("ACCOUNT_GROUP_RISK_ASSIGNMENT_ENDPOINT_NOT_FOUND",
          "error.masterdata.centralAssignment.endpointNotFound", "Risk Template not found", riskId);
    }
    return risk;
  }

  private static void requireActiveEndpoints(CentralAccountGroupEntity group, CentralRiskTemplateEntity risk) {
    if (group.getStatus() != MasterDataLifecycleStatus.ACTIVE || risk.getStatus() != MasterDataLifecycleStatus.ACTIVE) {
      throw new UnprocessableEntityException("ACCOUNT_GROUP_RISK_ASSIGNMENT_ENDPOINT_NOT_ACTIVE",
          "error.masterdata.centralAssignment.endpointNotActive",
          "The Account Group and Risk Template must both be active", group.getId(), risk.getId());
    }
  }

  private static void requireStatus(CentralAccountGroupRiskAssignmentEntity row, MasterDataLifecycleStatus status) {
    if (row.getStatus() != status) throw invalidTransition(row.getId());
  }

  private static UnprocessableEntityException invalidTransition(UUID id) {
    return new UnprocessableEntityException("INVALID_LIFECYCLE_TRANSITION",
        "error.masterdata.v2.invalidLifecycleTransition", "Invalid assignment lifecycle transition", id);
  }

  private static ConflictException versionConflict(UUID id) {
    return new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict",
        "The Risk Template or assignment has changed", id);
  }

  private JsonNode snapshot(CentralAccountGroupRiskAssignmentEntity row) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("id", row.getId());
    values.put("profileId", row.getProfileId());
    values.put("accountGroupId", row.getAccountGroupId());
    values.put("riskTemplateId", row.getRiskTemplateId());
    values.put("status", row.getStatus().wireValue());
    values.put("validFrom", row.getValidFrom());
    values.put("validTo", row.getValidTo());
    values.put("createdAt", row.getCreatedAt());
    values.put("createdBy", row.getCreatedBy());
    values.put("updatedAt", row.getUpdatedAt());
    values.put("updatedBy", row.getUpdatedBy());
    values.put("deletedAt", row.getDeletedAt());
    values.put("deletedBy", row.getDeletedBy());
    values.put("version", row.getVersion());
    return objectMapper.valueToTree(values);
  }

  private record Change(RevisionOperationType operation, UUID assignmentId, long version) {}
  public record LockedChange(CentralRiskTemplateEntity risk, Change change) {}
  private record Mutation(CentralAccountGroupRiskAssignmentEntity row, RevisionOperationType operation,
      Long expectedVersion, JsonNode before) {}
}
