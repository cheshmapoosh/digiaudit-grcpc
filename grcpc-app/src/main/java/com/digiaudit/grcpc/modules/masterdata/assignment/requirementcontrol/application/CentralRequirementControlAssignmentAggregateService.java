package com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationRequirementEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRequirementRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.api.mapper.CentralRequirementControlAssignmentMapper;
import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.domain.entity.CentralRequirementControlAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.domain.repository.CentralRequirementControlAssignmentRepository;
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
public class CentralRequirementControlAssignmentAggregateService {
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;
  private final CentralRequirementControlAssignmentRepository assignments;
  private final CentralRegulationRequirementRepository requirements;
  private final CentralRequirementControlAssignmentMapper mapper;
  private final RevisionMutationGuard guard;
  private final MasterDataAuthorizationService authorization;
  private final CurrentUserProvider users;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public CentralRequirementControlAssignmentAggregateService(CentralRequirementControlAssignmentRepository assignments,
      CentralRegulationRequirementRepository requirements, CentralRequirementControlAssignmentMapper mapper,
      RevisionMutationGuard guard, MasterDataAuthorizationService authorization, CurrentUserProvider users, ObjectMapper objectMapper,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.assignments = assignments; this.requirements = requirements; this.mapper = mapper;
    this.guard = guard; this.authorization = authorization;
    this.users = users; this.objectMapper = objectMapper; this.clock = clock;
  }

  /** Called by the owning aggregate after its sorted Guard union and in global endpoint order. */
  public void lockEndpoints(RevisionExecutionContext context, List<CentralRequirementControlAssignmentChangeRequest> changes) {
    if (changes == null || changes.isEmpty()) return;
    requireAssignmentAccess();
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.CONTROL);
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.REGULATION);
    requirements.lockAllByIds(uniqueIds(changes));
  }

  public PreparedChanges prepare(RevisionExecutionContext context, CentralControlEntity control,
      MasterDataLifecycleStatus finalControlStatus, List<CentralRequirementControlAssignmentChangeRequest> requestedChanges) {
    List<CentralRequirementControlAssignmentChangeRequest> changes = requestedChanges == null ? List.of() : new ArrayList<>(requestedChanges);
    if (changes.isEmpty()) return new PreparedChanges(control.getId(), List.of(), context);
    requireAssignmentAccess();
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.CONTROL);
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.REGULATION);
    List<UUID> requirementIds = uniqueIds(changes);
    Map<UUID, CentralRegulationRequirementEntity> destinationsById = requirements.findAllById(requirementIds).stream()
        .collect(Collectors.toMap(CentralRegulationRequirementEntity::getId, Function.identity()));
    for (UUID id : requirementIds) if (!destinationsById.containsKey(id)) throw endpointNotFound("Regulation Requirement", id);
    Map<UUID, CentralRequirementControlAssignmentEntity> rowsByDestination = assignments.lockByBusinessKeys(control.getId(), requirementIds)
        .stream().collect(Collectors.toMap(CentralRequirementControlAssignmentEntity::getRequirementId, Function.identity()));
    ControlEndpoint endpoint = new ControlEndpoint(control.getId(), finalControlStatus);
    List<PreparedMutation> mutations = new ArrayList<>();
    for (CentralRequirementControlAssignmentChangeRequest change : changes.stream().sorted(Comparator.comparing(CentralRequirementControlAssignmentChangeRequest::requirementId)).toList()) {
      CentralRequirementControlAssignmentEntity existing = rowsByDestination.get(change.requirementId());
      validateShape(change, existing);
      mutations.add(prepare(endpoint, destinationsById.get(change.requirementId()), existing, change));
    }
    return new PreparedChanges(control.getId(), mutations.stream().filter(Objects::nonNull).toList(), context);
  }

  public ApplyResult apply(PreparedChanges prepared, CentralControlEntity control) {
    if (!prepared.controlId.equals(control.getId())) throw new IllegalStateException("Prepared assignments belong to another Control");
    UUID actor = users.getCurrentPrincipal().getUserId(); Instant now = Instant.now(clock);
    for (PreparedMutation mutation : prepared.mutations) apply(mutation, actor, now);
    if (!prepared.mutations.isEmpty()) assignments.saveAllAndFlush(prepared.mutations.stream().map(PreparedMutation::entity).toList());
    List<RevisionContentResult> contents = prepared.mutations.stream().map(mutation -> revisionContent(mutation, prepared.context)).toList();
    List<CentralRequirementControlAssignmentResponse> canonical = canView() ? canonicalRows(control) : List.of();
    return new ApplyResult(contents, canonical);
  }

  public List<CentralRequirementControlAssignmentResponse> canonicalRows(CentralControlEntity control) {
    List<CentralRequirementControlAssignmentEntity> rows = assignments.findByControlIdAndStatusNot(control.getId(), DELETED);
    Map<UUID, CentralRegulationRequirementEntity> destinations = requirements.findAllById(rows.stream().map(CentralRequirementControlAssignmentEntity::getRequirementId).toList())
        .stream().collect(Collectors.toMap(CentralRegulationRequirementEntity::getId, Function.identity()));
    return rows.stream().map(row -> mapper.response(row, control, requireDestination(destinations, row.getRequirementId())))
        .sorted(Comparator.comparing(CentralRequirementControlAssignmentResponse::requirementCode).thenComparing(CentralRequirementControlAssignmentResponse::assignmentId)).toList();
  }

  private PreparedMutation prepare(ControlEndpoint control, CentralRegulationRequirementEntity group,
      CentralRequirementControlAssignmentEntity existing, CentralRequirementControlAssignmentChangeRequest change) {
    return switch (change.operation()) {
      case CREATE_OR_RESTORE -> createOrRestore(control, group, existing, change.validFrom(), change.validTo());
      case UPDATE -> {
        CentralRequirementControlAssignmentEntity row = requireExisting(existing, change.requirementId());
        requireAssignmentAccess(); requireNotDeleted(row); assertVersion(row, change.version());
        validateDates(change.validFrom(), change.validTo());
        MasterDataLifecycleStatus requested = change.requestedStatus() == null ? row.getStatus() : editableStatus(change.requestedStatus());
        if (requested != row.getStatus()) {

          RevisionOperationType lifecycle = requested == MasterDataLifecycleStatus.ACTIVE ? RevisionOperationType.ACTIVATE : RevisionOperationType.INACTIVATE;
          validateLifecycle(row, lifecycle); if (lifecycle == RevisionOperationType.ACTIVATE) requireActiveEndpoints(control, group);
        }
        if (Objects.equals(row.getValidFrom(), change.validFrom()) && Objects.equals(row.getValidTo(), change.validTo()) && requested == row.getStatus()) yield null;
        yield new PreparedMutation(row, RevisionOperationType.UPDATE, row.getVersion(), snapshot(row), change.validFrom(), change.validTo(), requested);
      }
      case ACTIVATE -> lifecycle(control, group, existing, change, RevisionOperationType.ACTIVATE);
      case INACTIVATE -> lifecycle(control, group, existing, change, RevisionOperationType.INACTIVATE);
      case DELETE -> lifecycle(control, group, existing, change, RevisionOperationType.DELETE);
      case RESTORE -> lifecycle(control, group, existing, change, RevisionOperationType.RESTORE);
    };
  }

  private PreparedMutation createOrRestore(ControlEndpoint control, CentralRegulationRequirementEntity group,
      CentralRequirementControlAssignmentEntity existing, LocalDate from, LocalDate to) {
    requireActiveEndpoints(control, group); validateDates(from, to);
    if (existing == null) {

      return new PreparedMutation(CentralRequirementControlAssignmentEntity.create(UUID.randomUUID(), control.id, group.getId(), from, to,
          users.getCurrentPrincipal().getUserId(), Instant.now(clock)), RevisionOperationType.CREATE, null, null, from, to, MasterDataLifecycleStatus.ACTIVE);
    }
    if (existing.getStatus() == MasterDataLifecycleStatus.ACTIVE) throw duplicate(control.id, group.getId());
    RevisionOperationType operation = existing.getStatus() == DELETED ? RevisionOperationType.RESTORE : RevisionOperationType.ACTIVATE;

    return new PreparedMutation(existing, operation, existing.getVersion(), snapshot(existing), from, to, MasterDataLifecycleStatus.ACTIVE);
  }

  private PreparedMutation lifecycle(ControlEndpoint control, CentralRegulationRequirementEntity group,
      CentralRequirementControlAssignmentEntity existing, CentralRequirementControlAssignmentChangeRequest change, RevisionOperationType operation) {
    CentralRequirementControlAssignmentEntity row = requireExisting(existing, change.requirementId()); assertVersion(row, change.version()); validateLifecycle(row, operation);

    if (operation == RevisionOperationType.ACTIVATE || operation == RevisionOperationType.RESTORE) requireActiveEndpoints(control, group);
    return new PreparedMutation(row, operation, row.getVersion(), snapshot(row), row.getValidFrom(), row.getValidTo(), row.getStatus());
  }

  private void apply(PreparedMutation mutation, UUID actor, Instant now) {
    CentralRequirementControlAssignmentEntity row = mutation.entity;
    switch (mutation.operation) {
      case CREATE -> { }
      case UPDATE -> { row.update(mutation.validFrom, mutation.validTo, actor, now); if (mutation.requestedStatus != row.getStatus()) { if (mutation.requestedStatus == MasterDataLifecycleStatus.ACTIVE) row.activate(actor, now); else row.inactivate(actor, now); } }
      case ACTIVATE -> { if (row.getStatus() == MasterDataLifecycleStatus.INACTIVE) row.reactivateFromCreate(mutation.validFrom, mutation.validTo, actor, now); else row.activate(actor, now); }
      case INACTIVATE -> row.inactivate(actor, now);
      case DELETE -> row.delete(actor, now);
      case RESTORE -> { if (!Objects.equals(row.getValidFrom(), mutation.validFrom) || !Objects.equals(row.getValidTo(), mutation.validTo)) row.restoreFromCreate(mutation.validFrom, mutation.validTo, actor, now); else row.restore(actor, now); }
    }
  }

  private RevisionContentResult revisionContent(PreparedMutation mutation, RevisionExecutionContext context) {
    return RevisionContentResult.completed(RevisionEntityType.CENTRAL_REQUIREMENT_CONTROL_ASSIGNMENT, mutation.entity.getId(), mutation.operation,
        mutation.expectedVersion, mutation.before, snapshot(mutation.entity), mutation.entity.getVersion(),
        objectMapper.valueToTree(Map.of("validated", true, "hierarchyKeys", context.acquiredHierarchyKeys().stream().map(Enum::name).sorted().toList(),
            "lockOrder", "SORTED_GUARDS_CONTROL_RISK_TEMPLATE_CONTROL_OBJECTIVE_REQUIREMENT_ASSIGNMENTS")));
  }

  private List<UUID> uniqueIds(List<CentralRequirementControlAssignmentChangeRequest> changes) {
    Set<UUID> seen = new HashSet<>(); List<UUID> ids = new ArrayList<>();
    for (CentralRequirementControlAssignmentChangeRequest change : changes) {
      if (change == null || change.operation() == null || change.requirementId() == null) throw invalidChange("Each assignment change requires operation and requirementId");
      if (!seen.add(change.requirementId())) throw invalidChange("Duplicate Regulation Requirement operation in one aggregate request");
      ids.add(change.requirementId());
    }
    ids.sort(UUID::compareTo); return ids;
  }

  private void validateShape(CentralRequirementControlAssignmentChangeRequest c, CentralRequirementControlAssignmentEntity existing) {
    boolean create = c.operation() == CentralRequirementControlAssignmentChangeOperation.CREATE_OR_RESTORE;
    if (create) {
      if (c.assignmentId() != null || c.version() != null || c.requestedStatus() != null) throw invalidChange("CREATE_OR_RESTORE accepts only requirementId and validity fields");
      return;
    }
    if (c.assignmentId() == null || c.version() == null || c.version() < 0 || existing == null || !c.assignmentId().equals(existing.getId())) throw assignmentNotFound(c.assignmentId());
    if (c.operation() != CentralRequirementControlAssignmentChangeOperation.UPDATE && (c.validFrom() != null || c.validTo() != null || c.requestedStatus() != null)) throw invalidChange("Lifecycle operations must not carry update fields");
  }

  private void validateLifecycle(CentralRequirementControlAssignmentEntity row, RevisionOperationType op) {
    boolean valid = switch (op) { case ACTIVATE -> row.getStatus() == MasterDataLifecycleStatus.INACTIVE; case INACTIVATE -> row.getStatus() == MasterDataLifecycleStatus.ACTIVE; case DELETE -> row.getStatus() != DELETED; case RESTORE -> row.getStatus() == DELETED; default -> false; };
    if (!valid) throw new UnprocessableEntityException("INVALID_LIFECYCLE_TRANSITION", "error.masterdata.v2.invalidLifecycleTransition", "Invalid assignment lifecycle transition", row.getId());
  }
  private void requireActiveEndpoints(ControlEndpoint control, CentralRegulationRequirementEntity group) {
    if (control.status != MasterDataLifecycleStatus.ACTIVE) throw inactiveEndpoint("Control", control.id);
    if (group.getStatus() != MasterDataLifecycleStatus.ACTIVE) throw inactiveEndpoint("Regulation Requirement", group.getId());
  }
  private void validateDates(LocalDate from, LocalDate to) { if (from != null && to != null && to.isBefore(from)) throw new UnprocessableEntityException("DATE_RANGE_INVALID", "error.masterdata.v2.invalidValidityRange", "Validity range is invalid"); }
  private MasterDataLifecycleStatus editableStatus(MasterDataLifecycleStatus status) { if (status == DELETED) throw invalidChange("UPDATE requestedStatus must be ACTIVE or INACTIVE"); return status; }
  private void assertVersion(CentralRequirementControlAssignmentEntity row, Long version) { if (version == null || row.getVersion() != version) throw new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict", "The assignment has changed", row.getId()); }
  private void requireNotDeleted(CentralRequirementControlAssignmentEntity row) { if (row.getStatus() == DELETED) throw new UnprocessableEntityException("INVALID_LIFECYCLE_TRANSITION", "error.masterdata.v2.invalidLifecycleTransition", "Deleted assignment cannot be updated", row.getId()); }
  private CentralRequirementControlAssignmentEntity requireExisting(CentralRequirementControlAssignmentEntity row, UUID id) { if (row == null) throw assignmentNotFound(id); return row; }
  private CentralRegulationRequirementEntity requireDestination(Map<UUID, CentralRegulationRequirementEntity> values, UUID id) { CentralRegulationRequirementEntity value = values.get(id); if (value == null) throw endpointNotFound("Regulation Requirement", id); return value; }

  public boolean canView() { return authorization.canView("CONTROL") && authorization.canView("GOVERNANCE"); }
  private void requireAssignmentAccess() {
    authorization.requireManageWithReference("CONTROL", "GOVERNANCE");
  }
  private JsonNode snapshot(CentralRequirementControlAssignmentEntity row) { Map<String,Object> v = new LinkedHashMap<>(); v.put("id", row.getId()); v.put("controlId", row.getControlId()); v.put("requirementId", row.getRequirementId()); v.put("status", row.getStatus().wireValue()); v.put("validFrom", row.getValidFrom()); v.put("validTo", row.getValidTo()); v.put("version", row.getVersion()); v.put("createdAt", row.getCreatedAt()); v.put("createdBy", row.getCreatedBy()); v.put("updatedAt", row.getUpdatedAt()); v.put("updatedBy", row.getUpdatedBy()); v.put("deletedAt", row.getDeletedAt()); v.put("deletedBy", row.getDeletedBy()); return objectMapper.valueToTree(v); }
  private ConflictException duplicate(UUID c, UUID g) { return new ConflictException("DUPLICATE_RELATION", "error.masterdata.centralAssignment.duplicate", "This exact central definition pair already has an active Assignment", c, g); }
  private NotFoundException assignmentNotFound(UUID id) { return new NotFoundException("CENTRAL_REQUIREMENT_CONTROL_ASSIGNMENT_NOT_FOUND", "error.masterdata.centralAssignment.notFound", "Control Regulation Requirement assignment not found", id); }
  private NotFoundException endpointNotFound(String type, UUID id) { return new NotFoundException("REQUIREMENT_CONTROL_ASSIGNMENT_ENDPOINT_NOT_FOUND", "error.masterdata.centralAssignment.endpointNotFound", type + " endpoint not found", id); }
  private UnprocessableEntityException inactiveEndpoint(String type, UUID id) { return new UnprocessableEntityException("REQUIREMENT_CONTROL_ASSIGNMENT_ENDPOINT_NOT_ACTIVE", "error.masterdata.centralAssignment.endpointNotActive", type + " endpoint must be active", id); }
  private UnprocessableEntityException invalidChange(String message) { return new UnprocessableEntityException("REQUIREMENT_CONTROL_ASSIGNMENT_CHANGE_INVALID", "error.masterdata.centralAssignment.invalidChange", message); }

  private record ControlEndpoint(UUID id, MasterDataLifecycleStatus status) {}
  private record PreparedMutation(CentralRequirementControlAssignmentEntity entity, RevisionOperationType operation,
      Long expectedVersion, JsonNode before, LocalDate validFrom, LocalDate validTo, MasterDataLifecycleStatus requestedStatus) {}
  public static final class PreparedChanges { private final UUID controlId; private final List<PreparedMutation> mutations; private final RevisionExecutionContext context; private PreparedChanges(UUID controlId, List<PreparedMutation> mutations, RevisionExecutionContext context) { this.controlId = controlId; this.mutations = List.copyOf(mutations); this.context = context; } public boolean changed() { return !mutations.isEmpty(); } }
  public record ApplyResult(List<RevisionContentResult> revisionContents, List<CentralRequirementControlAssignmentResponse> canonicalRows) { public ApplyResult { revisionContents = List.copyOf(revisionContents); canonicalRows = List.copyOf(canonicalRows); } }
}
