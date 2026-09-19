package com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.entity.CentralAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.repository.CentralAccountGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.mapper.CentralControlAccountGroupMapper;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.domain.entity.CentralControlAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.domain.repository.CentralControlAccountGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionMutationGuard;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class CentralControlAccountGroupAggregateService {
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;
  private final CentralControlAccountGroupRepository classifications;
  private final CentralAccountGroupRepository accountGroups;
  private final CentralControlAccountGroupMapper mapper;
  private final RevisionMutationGuard guard;
  private final MasterDataAuthorizationService authorization;
  private final CurrentUserProvider users;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public CentralControlAccountGroupAggregateService(CentralControlAccountGroupRepository classifications,
      CentralAccountGroupRepository accountGroups, CentralControlAccountGroupMapper mapper,
      RevisionMutationGuard guard, MasterDataAuthorizationService authorization, CurrentUserProvider users, ObjectMapper objectMapper,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.classifications = classifications; this.accountGroups = accountGroups; this.mapper = mapper;
    this.guard = guard; this.authorization = authorization;
    this.users = users; this.objectMapper = objectMapper; this.clock = clock;
  }

  public PreparedChanges prepare(RevisionExecutionContext context, CentralControlEntity control,
      MasterDataLifecycleStatus finalControlStatus, List<CentralControlAccountGroupChangeRequest> requestedChanges) {
    List<CentralControlAccountGroupChangeRequest> changes = requestedChanges == null ? List.of() : List.copyOf(requestedChanges);
    if (changes.isEmpty()) return new PreparedChanges(control.getId(), List.of());
    requireScopeAccess();
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.ACCOUNT_GROUP);
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.CONTROL);
    List<UUID> accountGroupIds = uniqueIds(changes);
    Map<UUID, CentralAccountGroupEntity> groupsById = accountGroups.lockAllByIds(accountGroupIds).stream()
        .collect(Collectors.toMap(CentralAccountGroupEntity::getId, Function.identity()));
    for (UUID id : accountGroupIds) if (!groupsById.containsKey(id)) throw endpointNotFound("Account Group", id);
    Map<UUID, CentralControlAccountGroupEntity> rowsByGroup = classifications.lockByBusinessKeys(control.getId(), accountGroupIds)
        .stream().collect(Collectors.toMap(CentralControlAccountGroupEntity::getAccountGroupId, Function.identity()));
    ControlEndpoint endpoint = new ControlEndpoint(control.getId(), finalControlStatus);
    List<PreparedMutation> mutations = new ArrayList<>();
    for (CentralControlAccountGroupChangeRequest change : changes.stream().sorted(Comparator.comparing(CentralControlAccountGroupChangeRequest::accountGroupId)).toList()) {
      CentralControlAccountGroupEntity existing = rowsByGroup.get(change.accountGroupId());
      validateShape(change, existing);
      mutations.add(prepare(endpoint, groupsById.get(change.accountGroupId()), existing, change));
    }
    return new PreparedChanges(control.getId(), mutations);
  }

  public ApplyResult apply(PreparedChanges prepared, CentralControlEntity control) {
    if (!prepared.controlId.equals(control.getId())) throw new IllegalStateException("Prepared classifications belong to another Control");
    UUID actor = users.getCurrentPrincipal().getUserId(); Instant now = Instant.now(clock);
    for (PreparedMutation mutation : prepared.mutations) apply(mutation, actor, now);
    if (!prepared.mutations.isEmpty()) classifications.saveAllAndFlush(prepared.mutations.stream().map(PreparedMutation::entity).toList());
    List<RevisionContentResult> contents = prepared.mutations.stream().map(this::revisionContent).toList();
    List<CentralControlAccountGroupResponse> canonical = canView() ? canonicalRows(control) : List.of();
    return new ApplyResult(contents, canonical);
  }

  public List<CentralControlAccountGroupResponse> canonicalRows(CentralControlEntity control) {
    List<CentralControlAccountGroupEntity> rows = classifications.findByControlIdAndStatusNot(control.getId(), DELETED);
    Map<UUID, CentralAccountGroupEntity> groups = accountGroups.findAllById(rows.stream().map(CentralControlAccountGroupEntity::getAccountGroupId).toList())
        .stream().collect(Collectors.toMap(CentralAccountGroupEntity::getId, Function.identity()));
    return rows.stream().map(row -> mapper.response(row, control, requireGroup(groups, row.getAccountGroupId())))
        .sorted(Comparator.comparing(CentralControlAccountGroupResponse::accountGroupCode).thenComparing(CentralControlAccountGroupResponse::classificationId)).toList();
  }

  private PreparedMutation prepare(ControlEndpoint control, CentralAccountGroupEntity group,
      CentralControlAccountGroupEntity existing, CentralControlAccountGroupChangeRequest change) {
    return switch (change.operation()) {
      case CREATE_OR_RESTORE -> createOrRestore(control, group, existing, change.validFrom(), change.validTo());
      case UPDATE -> {
        CentralControlAccountGroupEntity row = requireExisting(existing, change.accountGroupId());
        requireScopeAccess(); requireNotDeleted(row); assertVersion(row, change.version());
        validateDates(change.validFrom(), change.validTo());
        MasterDataLifecycleStatus requested = change.requestedStatus() == null ? row.getStatus() : editableStatus(change.requestedStatus());
        if (requested != row.getStatus()) {

          RevisionOperationType lifecycle = requested == MasterDataLifecycleStatus.ACTIVE ? RevisionOperationType.ACTIVATE : RevisionOperationType.INACTIVATE;
          validateLifecycle(row, lifecycle); if (lifecycle == RevisionOperationType.ACTIVATE) requireActiveEndpoints(control, group);
        }
        yield new PreparedMutation(row, RevisionOperationType.UPDATE, row.getVersion(), snapshot(row), change.validFrom(), change.validTo(), requested);
      }
      case ACTIVATE -> lifecycle(control, group, existing, change, RevisionOperationType.ACTIVATE);
      case INACTIVATE -> lifecycle(control, group, existing, change, RevisionOperationType.INACTIVATE);
      case DELETE -> lifecycle(control, group, existing, change, RevisionOperationType.DELETE);
      case RESTORE -> lifecycle(control, group, existing, change, RevisionOperationType.RESTORE);
    };
  }

  private PreparedMutation createOrRestore(ControlEndpoint control, CentralAccountGroupEntity group,
      CentralControlAccountGroupEntity existing, LocalDate from, LocalDate to) {
    requireActiveEndpoints(control, group); validateDates(from, to);
    if (existing == null) {

      return new PreparedMutation(CentralControlAccountGroupEntity.create(UUID.randomUUID(), control.id, group.getId(), from, to,
          users.getCurrentPrincipal().getUserId(), Instant.now(clock)), RevisionOperationType.CREATE, null, null, from, to, MasterDataLifecycleStatus.ACTIVE);
    }
    if (existing.getStatus() == MasterDataLifecycleStatus.ACTIVE) throw duplicate(control.id, group.getId());
    RevisionOperationType operation = existing.getStatus() == DELETED ? RevisionOperationType.RESTORE : RevisionOperationType.ACTIVATE;

    return new PreparedMutation(existing, operation, existing.getVersion(), snapshot(existing), from, to, MasterDataLifecycleStatus.ACTIVE);
  }

  private PreparedMutation lifecycle(ControlEndpoint control, CentralAccountGroupEntity group,
      CentralControlAccountGroupEntity existing, CentralControlAccountGroupChangeRequest change, RevisionOperationType operation) {
    CentralControlAccountGroupEntity row = requireExisting(existing, change.accountGroupId()); assertVersion(row, change.version()); validateLifecycle(row, operation);

    if (operation == RevisionOperationType.ACTIVATE || operation == RevisionOperationType.RESTORE) requireActiveEndpoints(control, group);
    return new PreparedMutation(row, operation, row.getVersion(), snapshot(row), row.getValidFrom(), row.getValidTo(), row.getStatus());
  }

  private void apply(PreparedMutation mutation, UUID actor, Instant now) {
    CentralControlAccountGroupEntity row = mutation.entity;
    switch (mutation.operation) {
      case CREATE -> { }
      case UPDATE -> { row.update(mutation.validFrom, mutation.validTo, actor, now); if (mutation.requestedStatus != row.getStatus()) { if (mutation.requestedStatus == MasterDataLifecycleStatus.ACTIVE) row.activate(actor, now); else row.inactivate(actor, now); } }
      case ACTIVATE -> { if (row.getStatus() == MasterDataLifecycleStatus.INACTIVE) row.reactivateFromCreate(mutation.validFrom, mutation.validTo, actor, now); else row.activate(actor, now); }
      case INACTIVATE -> row.inactivate(actor, now);
      case DELETE -> row.delete(actor, now);
      case RESTORE -> { if (!Objects.equals(row.getValidFrom(), mutation.validFrom) || !Objects.equals(row.getValidTo(), mutation.validTo)) row.restoreFromCreate(mutation.validFrom, mutation.validTo, actor, now); else row.restore(actor, now); }
    }
  }

  private RevisionContentResult revisionContent(PreparedMutation mutation) {
    return RevisionContentResult.completed(RevisionEntityType.CENTRAL_CONTROL_ACCOUNT_GROUP, mutation.entity.getId(), mutation.operation,
        mutation.expectedVersion, mutation.before, snapshot(mutation.entity), mutation.entity.getVersion(),
        objectMapper.valueToTree(Map.of("validated", true, "hierarchyKeys", List.of("ACCOUNT_GROUP", "CONTROL"),
            "lockOrder", "ACCOUNT_GROUP_GUARD_CONTROL_GUARD_CONTROL_ACCOUNT_GROUPS_CLASSIFICATIONS")));
  }

  private List<UUID> uniqueIds(List<CentralControlAccountGroupChangeRequest> changes) {
    Set<UUID> seen = new HashSet<>(); List<UUID> ids = new ArrayList<>();
    for (CentralControlAccountGroupChangeRequest change : changes) {
      if (change == null || change.operation() == null || change.accountGroupId() == null) throw invalidChange("Each classification change requires operation and accountGroupId");
      if (!seen.add(change.accountGroupId())) throw invalidChange("Duplicate Account Group operation in one aggregate request");
      ids.add(change.accountGroupId());
    }
    ids.sort(UUID::compareTo); return ids;
  }

  private void validateShape(CentralControlAccountGroupChangeRequest c, CentralControlAccountGroupEntity existing) {
    boolean create = c.operation() == CentralControlAccountGroupChangeOperation.CREATE_OR_RESTORE;
    if (create) {
      if (c.classificationId() != null || c.version() != null || c.requestedStatus() != null) throw invalidChange("CREATE_OR_RESTORE accepts only accountGroupId and validity fields");
      return;
    }
    if (c.classificationId() == null || c.version() == null || c.version() < 0 || existing == null || !c.classificationId().equals(existing.getId())) throw classificationNotFound(c.classificationId());
    if (c.operation() != CentralControlAccountGroupChangeOperation.UPDATE && (c.validFrom() != null || c.validTo() != null || c.requestedStatus() != null)) throw invalidChange("Lifecycle operations must not carry update fields");
  }

  private void validateLifecycle(CentralControlAccountGroupEntity row, RevisionOperationType op) {
    boolean valid = switch (op) { case ACTIVATE -> row.getStatus() == MasterDataLifecycleStatus.INACTIVE; case INACTIVATE -> row.getStatus() == MasterDataLifecycleStatus.ACTIVE; case DELETE -> row.getStatus() != DELETED; case RESTORE -> row.getStatus() == DELETED; default -> false; };
    if (!valid) throw new UnprocessableEntityException("INVALID_LIFECYCLE_TRANSITION", "error.masterdata.v2.invalidLifecycleTransition", "Invalid classification lifecycle transition", row.getId());
  }
  private void requireActiveEndpoints(ControlEndpoint control, CentralAccountGroupEntity group) {
    if (control.status != MasterDataLifecycleStatus.ACTIVE) throw inactiveEndpoint("Control", control.id);
    if (group.getStatus() != MasterDataLifecycleStatus.ACTIVE) throw inactiveEndpoint("Account Group", group.getId());
  }
  private void validateDates(LocalDate from, LocalDate to) { if (from != null && to != null && to.isBefore(from)) throw new UnprocessableEntityException("DATE_RANGE_INVALID", "error.masterdata.v2.invalidValidityRange", "Validity range is invalid"); }
  private MasterDataLifecycleStatus editableStatus(MasterDataLifecycleStatus status) { if (status == DELETED) throw invalidChange("UPDATE requestedStatus must be ACTIVE or INACTIVE"); return status; }
  private void assertVersion(CentralControlAccountGroupEntity row, Long version) { if (version == null || row.getVersion() != version) throw new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict", "The classification has changed", row.getId()); }
  private void requireNotDeleted(CentralControlAccountGroupEntity row) { if (row.getStatus() == DELETED) throw new UnprocessableEntityException("INVALID_LIFECYCLE_TRANSITION", "error.masterdata.v2.invalidLifecycleTransition", "Deleted classification cannot be updated", row.getId()); }
  private CentralControlAccountGroupEntity requireExisting(CentralControlAccountGroupEntity row, UUID id) { if (row == null) throw classificationNotFound(id); return row; }
  private CentralAccountGroupEntity requireGroup(Map<UUID, CentralAccountGroupEntity> values, UUID id) { CentralAccountGroupEntity value = values.get(id); if (value == null) throw endpointNotFound("Account Group", id); return value; }

  public boolean canView() { return authorization.canView("CONTROL") && authorization.canView("REFERENCE"); }
  private void requireScopeAccess() {
    authorization.requireManageWithReference("CONTROL", "REFERENCE");
  }
  private JsonNode snapshot(CentralControlAccountGroupEntity row) { Map<String,Object> v = new LinkedHashMap<>(); v.put("id", row.getId()); v.put("controlId", row.getControlId()); v.put("accountGroupId", row.getAccountGroupId()); v.put("status", row.getStatus().wireValue()); v.put("validFrom", row.getValidFrom()); v.put("validTo", row.getValidTo()); v.put("version", row.getVersion()); v.put("createdAt", row.getCreatedAt()); v.put("createdBy", row.getCreatedBy()); v.put("updatedAt", row.getUpdatedAt()); v.put("updatedBy", row.getUpdatedBy()); v.put("deletedAt", row.getDeletedAt()); v.put("deletedBy", row.getDeletedBy()); return objectMapper.valueToTree(v); }
  private ConflictException duplicate(UUID c, UUID g) { return new ConflictException("DUPLICATE_RELATION", "error.masterdata.controlAccountGroup.duplicate", "The Control is already classified to the Account Group", c, g); }
  private NotFoundException classificationNotFound(UUID id) { return new NotFoundException("CENTRAL_CONTROL_ACCOUNT_GROUP_NOT_FOUND", "error.masterdata.controlAccountGroup.notFound", "Control Account Group classification not found", id); }
  private NotFoundException endpointNotFound(String type, UUID id) { return new NotFoundException("CONTROL_ACCOUNT_GROUP_ENDPOINT_NOT_FOUND", "error.masterdata.controlAccountGroup.endpointNotFound", type + " endpoint not found", id); }
  private UnprocessableEntityException inactiveEndpoint(String type, UUID id) { return new UnprocessableEntityException("CONTROL_ACCOUNT_GROUP_ENDPOINT_NOT_ACTIVE", "error.masterdata.controlAccountGroup.endpointNotActive", type + " endpoint must be active", id); }
  private UnprocessableEntityException invalidChange(String message) { return new UnprocessableEntityException("CONTROL_ACCOUNT_GROUP_CHANGE_INVALID", "error.masterdata.controlAccountGroup.invalidChange", message); }

  private record ControlEndpoint(UUID id, MasterDataLifecycleStatus status) {}
  private record PreparedMutation(CentralControlAccountGroupEntity entity, RevisionOperationType operation,
      Long expectedVersion, JsonNode before, LocalDate validFrom, LocalDate validTo, MasterDataLifecycleStatus requestedStatus) {}
  public static final class PreparedChanges { private final UUID controlId; private final List<PreparedMutation> mutations; private PreparedChanges(UUID controlId, List<PreparedMutation> mutations) { this.controlId = controlId; this.mutations = List.copyOf(mutations); } public boolean changed() { return !mutations.isEmpty(); } }
  public record ApplyResult(List<RevisionContentResult> revisionContents, List<CentralControlAccountGroupResponse> canonicalRows) { public ApplyResult { revisionContents = List.copyOf(revisionContents); canonicalRows = List.copyOf(canonicalRows); } }
}
