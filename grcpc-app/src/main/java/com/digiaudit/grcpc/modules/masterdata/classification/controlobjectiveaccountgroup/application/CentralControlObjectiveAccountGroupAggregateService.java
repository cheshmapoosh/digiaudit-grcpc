package com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.entity.CentralAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.repository.CentralAccountGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto.CentralControlObjectiveAccountGroupChangeOperation;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto.CentralControlObjectiveAccountGroupChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto.CentralControlObjectiveAccountGroupResponse;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.mapper.CentralControlObjectiveAccountGroupMapper;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.domain.entity.CentralControlObjectiveAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.domain.repository.CentralControlObjectiveAccountGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionMutationGuard;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class CentralControlObjectiveAccountGroupAggregateService {
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;
  private static final RevisionEntityType ENTITY_TYPE =
      RevisionEntityType.CENTRAL_CONTROL_OBJECTIVE_ACCOUNT_GROUP;

  private final CentralControlObjectiveAccountGroupRepository classifications;
  private final CentralAccountGroupRepository accountGroups;
  private final CentralControlObjectiveAccountGroupMapper mapper;
  private final RevisionMutationGuard guard;
  private final MasterDataAuthorizationService authorization;
  private final CurrentUserProvider users;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public CentralControlObjectiveAccountGroupAggregateService(
      CentralControlObjectiveAccountGroupRepository classifications,
      CentralAccountGroupRepository accountGroups,
      CentralControlObjectiveAccountGroupMapper mapper,
      RevisionMutationGuard guard,
      MasterDataAuthorizationService authorization,
      CurrentUserProvider users,
      ObjectMapper objectMapper,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.classifications = classifications;
    this.accountGroups = accountGroups;
    this.mapper = mapper;
    this.guard = guard;
    this.authorization = authorization;
    this.users = users;
    this.objectMapper = objectMapper;
    this.clock = clock;
  }

  public PreparedChanges prepare(
      RevisionExecutionContext context,
      CentralControlObjectiveEntity controlObjective,
      MasterDataLifecycleStatus finalControlObjectiveStatus,
      List<CentralControlObjectiveAccountGroupChangeRequest> requestedChanges) {
    List<CentralControlObjectiveAccountGroupChangeRequest> changes =
        requestedChanges == null ? List.of() : new ArrayList<>(requestedChanges);
    if (changes.isEmpty()) return new PreparedChanges(controlObjective.getId(), List.of());
    requireScopeAccess();

    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.ACCOUNT_GROUP);
    List<UUID> accountGroupIds = uniqueIds(changes);
    Map<UUID, CentralAccountGroupEntity> groupsById = accountGroups.lockAllByIds(accountGroupIds)
        .stream().collect(Collectors.toMap(CentralAccountGroupEntity::getId, Function.identity()));
    for (UUID accountGroupId : accountGroupIds) {
      if (!groupsById.containsKey(accountGroupId)) throw endpointNotFound("Account Group", accountGroupId);
    }
    Map<UUID, CentralControlObjectiveAccountGroupEntity> rowsByGroup =
        classifications.lockByBusinessKeys(controlObjective.getId(), accountGroupIds).stream()
            .collect(Collectors.toMap(
                CentralControlObjectiveAccountGroupEntity::getAccountGroupId,
                Function.identity()));

    ControlObjectiveEndpoint endpoint =
        new ControlObjectiveEndpoint(controlObjective.getId(), finalControlObjectiveStatus);
    List<PreparedMutation> mutations = new ArrayList<>();
    for (CentralControlObjectiveAccountGroupChangeRequest change : changes.stream()
        .sorted(Comparator.comparing(CentralControlObjectiveAccountGroupChangeRequest::accountGroupId))
        .toList()) {
      CentralControlObjectiveAccountGroupEntity existing = rowsByGroup.get(change.accountGroupId());
      validateShape(change, existing);
      mutations.add(prepare(endpoint, groupsById.get(change.accountGroupId()), existing, change));
    }
    return new PreparedChanges(controlObjective.getId(), mutations);
  }

  public ApplyResult apply(
      PreparedChanges prepared, CentralControlObjectiveEntity controlObjective) {
    if (!prepared.controlObjectiveId.equals(controlObjective.getId())) {
      throw new IllegalStateException(
          "Prepared classifications belong to another Control Objective");
    }
    UUID actorId = users.getCurrentPrincipal().getUserId();
    Instant now = Instant.now(clock);
    for (PreparedMutation mutation : prepared.mutations) apply(mutation, actorId, now);
    if (!prepared.mutations.isEmpty()) {
      classifications.saveAllAndFlush(
          prepared.mutations.stream().map(PreparedMutation::entity).toList());
    }
    List<RevisionContentResult> contents =
        prepared.mutations.stream().map(this::revisionContent).toList();
    List<CentralControlObjectiveAccountGroupResponse> canonical =
        canView() ? canonicalRows(controlObjective) : List.of();
    return new ApplyResult(contents, canonical);
  }

  public List<CentralControlObjectiveAccountGroupResponse> canonicalRows(
      CentralControlObjectiveEntity controlObjective) {
    List<CentralControlObjectiveAccountGroupEntity> rows =
        classifications.findByControlObjectiveIdAndStatusNot(controlObjective.getId(), DELETED);
    Map<UUID, CentralAccountGroupEntity> groups = accountGroups.findAllById(
            rows.stream().map(CentralControlObjectiveAccountGroupEntity::getAccountGroupId).toList())
        .stream().collect(Collectors.toMap(CentralAccountGroupEntity::getId, Function.identity()));
    return rows.stream()
        .map(row -> mapper.response(
            row, controlObjective, requireGroup(groups, row.getAccountGroupId())))
        .sorted(Comparator.comparing(CentralControlObjectiveAccountGroupResponse::accountGroupCode)
            .thenComparing(CentralControlObjectiveAccountGroupResponse::classificationId))
        .toList();
  }

  private PreparedMutation prepare(
      ControlObjectiveEndpoint controlObjective,
      CentralAccountGroupEntity group,
      CentralControlObjectiveAccountGroupEntity existing,
      CentralControlObjectiveAccountGroupChangeRequest change) {
    return switch (change.operation()) {
      case CREATE_OR_RESTORE -> createOrRestore(
          controlObjective, group, existing, change.validFrom(), change.validTo());
      case UPDATE -> {
        CentralControlObjectiveAccountGroupEntity row =
            requireExisting(existing, change.accountGroupId());

        requireNotDeleted(row);
        assertVersion(row, change.version());
        validateDates(change.validFrom(), change.validTo());
        MasterDataLifecycleStatus requested = change.requestedStatus() == null
            ? row.getStatus() : editableStatus(change.requestedStatus());
        if (requested != row.getStatus()) {

          RevisionOperationType lifecycle = requested == MasterDataLifecycleStatus.ACTIVE
              ? RevisionOperationType.ACTIVATE : RevisionOperationType.INACTIVATE;
          validateLifecycle(row, lifecycle);
          if (lifecycle == RevisionOperationType.ACTIVATE) {
            requireActiveEndpoints(controlObjective, group);
          }
        }
        yield new PreparedMutation(
            row, RevisionOperationType.UPDATE, row.getVersion(), snapshot(row),
            change.validFrom(), change.validTo(), requested);
      }
      case ACTIVATE -> lifecycle(
          controlObjective, group, existing, change, RevisionOperationType.ACTIVATE);
      case INACTIVATE -> lifecycle(
          controlObjective, group, existing, change, RevisionOperationType.INACTIVATE);
      case DELETE -> lifecycle(
          controlObjective, group, existing, change, RevisionOperationType.DELETE);
      case RESTORE -> lifecycle(
          controlObjective, group, existing, change, RevisionOperationType.RESTORE);
    };
  }

  private PreparedMutation createOrRestore(
      ControlObjectiveEndpoint controlObjective,
      CentralAccountGroupEntity group,
      CentralControlObjectiveAccountGroupEntity existing,
      LocalDate validFrom,
      LocalDate validTo) {
    requireActiveEndpoints(controlObjective, group);
    validateDates(validFrom, validTo);
    if (existing == null) {

      return new PreparedMutation(
          CentralControlObjectiveAccountGroupEntity.create(
              UUID.randomUUID(), controlObjective.id, group.getId(), validFrom, validTo,
              users.getCurrentPrincipal().getUserId(), Instant.now(clock)),
          RevisionOperationType.CREATE, null, null, validFrom, validTo,
          MasterDataLifecycleStatus.ACTIVE);
    }
    if (existing.getStatus() == MasterDataLifecycleStatus.ACTIVE) {
      throw duplicate(controlObjective.id, group.getId());
    }
    RevisionOperationType operation = existing.getStatus() == DELETED
        ? RevisionOperationType.RESTORE : RevisionOperationType.ACTIVATE;

    return new PreparedMutation(
        existing, operation, existing.getVersion(), snapshot(existing),
        validFrom, validTo, MasterDataLifecycleStatus.ACTIVE);
  }

  private PreparedMutation lifecycle(
      ControlObjectiveEndpoint controlObjective,
      CentralAccountGroupEntity group,
      CentralControlObjectiveAccountGroupEntity existing,
      CentralControlObjectiveAccountGroupChangeRequest change,
      RevisionOperationType operation) {
    CentralControlObjectiveAccountGroupEntity row =
        requireExisting(existing, change.accountGroupId());
    assertVersion(row, change.version());
    validateLifecycle(row, operation);

    if (operation == RevisionOperationType.ACTIVATE
        || operation == RevisionOperationType.RESTORE) {
      requireActiveEndpoints(controlObjective, group);
    }
    return new PreparedMutation(
        row, operation, row.getVersion(), snapshot(row),
        row.getValidFrom(), row.getValidTo(), row.getStatus());
  }

  private void apply(PreparedMutation mutation, UUID actorId, Instant now) {
    CentralControlObjectiveAccountGroupEntity row = mutation.entity;
    switch (mutation.operation) {
      case CREATE -> { }
      case UPDATE -> {
        row.update(mutation.validFrom, mutation.validTo, actorId, now);
        if (mutation.requestedStatus != row.getStatus()) {
          if (mutation.requestedStatus == MasterDataLifecycleStatus.ACTIVE) row.activate(actorId, now);
          else row.inactivate(actorId, now);
        }
      }
      case ACTIVATE -> {
        if (row.getStatus() == MasterDataLifecycleStatus.INACTIVE) {
          row.reactivateFromCreate(mutation.validFrom, mutation.validTo, actorId, now);
        } else {
          row.activate(actorId, now);
        }
      }
      case INACTIVATE -> row.inactivate(actorId, now);
      case DELETE -> row.delete(actorId, now);
      case RESTORE -> {
        if (!Objects.equals(row.getValidFrom(), mutation.validFrom)
            || !Objects.equals(row.getValidTo(), mutation.validTo)) {
          row.restoreFromCreate(mutation.validFrom, mutation.validTo, actorId, now);
        } else {
          row.restore(actorId, now);
        }
      }
    }
  }

  private RevisionContentResult revisionContent(PreparedMutation mutation) {
    return RevisionContentResult.completed(
        ENTITY_TYPE, mutation.entity.getId(), mutation.operation,
        mutation.expectedVersion, mutation.before, snapshot(mutation.entity),
        mutation.entity.getVersion(), objectMapper.valueToTree(Map.of(
            "validated", true,
            "hierarchyKey", MasterDataHierarchyKey.ACCOUNT_GROUP.name(),
            "lockOrder", "ACCOUNT_GROUP_GUARD_CONTROL_OBJECTIVE_ACCOUNT_GROUPS_CLASSIFICATIONS")));
  }

  private List<UUID> uniqueIds(
      List<CentralControlObjectiveAccountGroupChangeRequest> changes) {
    Set<UUID> seen = new HashSet<>();
    List<UUID> ids = new ArrayList<>();
    for (CentralControlObjectiveAccountGroupChangeRequest change : changes) {
      if (change == null || change.operation() == null || change.accountGroupId() == null) {
        throw invalidChange("Each classification change requires operation and accountGroupId");
      }
      if (!seen.add(change.accountGroupId())) {
        throw invalidChange("Duplicate Account Group operation in one aggregate request");
      }
      ids.add(change.accountGroupId());
    }
    ids.sort(UUID::compareTo);
    return ids;
  }

  private void validateShape(
      CentralControlObjectiveAccountGroupChangeRequest change,
      CentralControlObjectiveAccountGroupEntity existing) {
    if (change.operation()
        == CentralControlObjectiveAccountGroupChangeOperation.CREATE_OR_RESTORE) {
      if (change.classificationId() != null || change.version() != null
          || change.requestedStatus() != null) {
        throw invalidChange(
            "CREATE_OR_RESTORE accepts only accountGroupId and validity fields");
      }
      return;
    }
    if (change.classificationId() == null || change.version() == null
        || change.version() < 0 || existing == null
        || !change.classificationId().equals(existing.getId())) {
      throw classificationNotFound(change.classificationId());
    }
    if (change.operation() != CentralControlObjectiveAccountGroupChangeOperation.UPDATE
        && (change.validFrom() != null || change.validTo() != null
            || change.requestedStatus() != null)) {
      throw invalidChange("Lifecycle operations must not carry update fields");
    }
  }

  private void validateLifecycle(
      CentralControlObjectiveAccountGroupEntity row, RevisionOperationType operation) {
    boolean valid = switch (operation) {
      case ACTIVATE -> row.getStatus() == MasterDataLifecycleStatus.INACTIVE;
      case INACTIVATE -> row.getStatus() == MasterDataLifecycleStatus.ACTIVE;
      case DELETE -> row.getStatus() != DELETED;
      case RESTORE -> row.getStatus() == DELETED;
      default -> false;
    };
    if (!valid) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_TRANSITION", "error.masterdata.v2.invalidLifecycleTransition",
          "Invalid Control Objective classification lifecycle transition", row.getId());
    }
  }

  private void requireActiveEndpoints(
      ControlObjectiveEndpoint controlObjective, CentralAccountGroupEntity group) {
    if (controlObjective.status != MasterDataLifecycleStatus.ACTIVE) {
      throw inactiveEndpoint("Control Objective", controlObjective.id);
    }
    if (group.getStatus() != MasterDataLifecycleStatus.ACTIVE) {
      throw inactiveEndpoint("Account Group", group.getId());
    }
  }

  private void validateDates(LocalDate validFrom, LocalDate validTo) {
    if (validFrom != null && validTo != null && validTo.isBefore(validFrom)) {
      throw new UnprocessableEntityException(
          "DATE_RANGE_INVALID", "error.masterdata.v2.invalidValidityRange",
          "Validity range is invalid");
    }
  }

  private MasterDataLifecycleStatus editableStatus(MasterDataLifecycleStatus status) {
    if (status == DELETED) throw invalidChange("UPDATE requestedStatus must be ACTIVE or INACTIVE");
    return status;
  }

  private void assertVersion(CentralControlObjectiveAccountGroupEntity row, Long version) {
    if (version == null || row.getVersion() != version) {
      throw new ConflictException(
          "VERSION_CONFLICT", "error.masterdata.v2.versionConflict",
          "The classification has changed", row.getId());
    }
  }

  private void requireNotDeleted(CentralControlObjectiveAccountGroupEntity row) {
    if (row.getStatus() == DELETED) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_TRANSITION", "error.masterdata.v2.invalidLifecycleTransition",
          "Deleted classification cannot be updated", row.getId());
    }
  }

  private CentralControlObjectiveAccountGroupEntity requireExisting(
      CentralControlObjectiveAccountGroupEntity row, UUID accountGroupId) {
    if (row == null) throw classificationNotFound(accountGroupId);
    return row;
  }

  private CentralAccountGroupEntity requireGroup(
      Map<UUID, CentralAccountGroupEntity> groups, UUID id) {
    CentralAccountGroupEntity value = groups.get(id);
    if (value == null) throw endpointNotFound("Account Group", id);
    return value;
  }

  public boolean canView() {
    return authorization.canView("CONTROL") && authorization.canView("REFERENCE");
  }


  private void requireScopeAccess() {
    authorization.requireManageWithReference("CONTROL", "REFERENCE");
  }

  private JsonNode snapshot(CentralControlObjectiveAccountGroupEntity row) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("id", row.getId());
    values.put("controlObjectiveId", row.getControlObjectiveId());
    values.put("accountGroupId", row.getAccountGroupId());
    values.put("status", row.getStatus().wireValue());
    values.put("validFrom", row.getValidFrom());
    values.put("validTo", row.getValidTo());
    values.put("version", row.getVersion());
    values.put("createdAt", row.getCreatedAt());
    values.put("createdBy", row.getCreatedBy());
    values.put("updatedAt", row.getUpdatedAt());
    values.put("updatedBy", row.getUpdatedBy());
    values.put("deletedAt", row.getDeletedAt());
    values.put("deletedBy", row.getDeletedBy());
    return objectMapper.valueToTree(values);
  }

  private ConflictException duplicate(UUID objectiveId, UUID groupId) {
    return new ConflictException(
        "DUPLICATE_RELATION", "error.masterdata.controlObjectiveAccountGroup.duplicate",
        "The Control Objective is already classified to the Account Group",
        objectiveId, groupId);
  }

  private NotFoundException classificationNotFound(UUID id) {
    return new NotFoundException(
        "CENTRAL_CONTROL_OBJECTIVE_ACCOUNT_GROUP_NOT_FOUND",
        "error.masterdata.controlObjectiveAccountGroup.notFound",
        "Control Objective Account Group classification not found", id);
  }

  private NotFoundException endpointNotFound(String type, UUID id) {
    return new NotFoundException(
        "CONTROL_OBJECTIVE_ACCOUNT_GROUP_ENDPOINT_NOT_FOUND",
        "error.masterdata.controlObjectiveAccountGroup.endpointNotFound",
        type + " endpoint not found", id);
  }

  private UnprocessableEntityException inactiveEndpoint(String type, UUID id) {
    return new UnprocessableEntityException(
        "CONTROL_OBJECTIVE_ACCOUNT_GROUP_ENDPOINT_NOT_ACTIVE",
        "error.masterdata.controlObjectiveAccountGroup.endpointNotActive",
        type + " endpoint must be active", id);
  }

  private UnprocessableEntityException invalidChange(String message) {
    return new UnprocessableEntityException(
        "CONTROL_OBJECTIVE_ACCOUNT_GROUP_CHANGE_INVALID",
        "error.masterdata.controlObjectiveAccountGroup.invalidChange", message);
  }

  private record ControlObjectiveEndpoint(UUID id, MasterDataLifecycleStatus status) {}

  private record PreparedMutation(
      CentralControlObjectiveAccountGroupEntity entity,
      RevisionOperationType operation,
      Long expectedVersion,
      JsonNode before,
      LocalDate validFrom,
      LocalDate validTo,
      MasterDataLifecycleStatus requestedStatus) {}

  public static final class PreparedChanges {
    private final UUID controlObjectiveId;
    private final List<PreparedMutation> mutations;

    private PreparedChanges(UUID controlObjectiveId, List<PreparedMutation> mutations) {
      this.controlObjectiveId = controlObjectiveId;
      this.mutations = List.copyOf(mutations);
    }

    public boolean changed() { return !mutations.isEmpty(); }
  }

  public record ApplyResult(
      List<RevisionContentResult> revisionContents,
      List<CentralControlObjectiveAccountGroupResponse> canonicalRows) {
    public ApplyResult {
      revisionContents = List.copyOf(revisionContents);
      canonicalRows = List.copyOf(canonicalRows);
    }
  }
}
