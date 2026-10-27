package com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskTemplateEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.repository.CentralRiskTemplateRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api.mapper.CentralRiskControlObjectiveAssignmentMapper;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.domain.entity.CentralRiskControlObjectiveAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.domain.repository.CentralRiskControlObjectiveAssignmentRepository;
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
public class CentralRiskControlObjectiveAssignmentAggregateService {
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;
  private final CentralRiskControlObjectiveAssignmentRepository assignments;
  private final CentralRiskTemplateRepository riskTemplates;
  private final CentralRiskControlObjectiveAssignmentMapper mapper;
  private final RevisionMutationGuard guard;
  private final MasterDataAuthorizationService authorization;
  private final CurrentUserProvider users;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public CentralRiskControlObjectiveAssignmentAggregateService(CentralRiskControlObjectiveAssignmentRepository assignments,
      CentralRiskTemplateRepository riskTemplates, CentralRiskControlObjectiveAssignmentMapper mapper,
      RevisionMutationGuard guard, MasterDataAuthorizationService authorization, CurrentUserProvider users, ObjectMapper objectMapper,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.assignments = assignments; this.riskTemplates = riskTemplates; this.mapper = mapper;
    this.guard = guard; this.authorization = authorization;
    this.users = users; this.objectMapper = objectMapper; this.clock = clock;
  }

  /** Called by the owning aggregate after its sorted Guard union and in global endpoint order. */
  public void lockEndpoints(RevisionExecutionContext context, List<CentralRiskControlObjectiveAssignmentChangeRequest> changes) {
    if (changes == null || changes.isEmpty()) return;
    requireAssignmentAccess();
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.RISK);
    riskTemplates.lockAllByIds(uniqueIds(changes));
  }

  public PreparedChanges prepare(RevisionExecutionContext context, CentralControlObjectiveEntity controlObjective,
      MasterDataLifecycleStatus finalControlObjectiveStatus, List<CentralRiskControlObjectiveAssignmentChangeRequest> requestedChanges) {
    List<CentralRiskControlObjectiveAssignmentChangeRequest> changes = requestedChanges == null ? List.of() : new ArrayList<>(requestedChanges);
    if (changes.isEmpty()) return new PreparedChanges(controlObjective.getId(), List.of(), context);
    requireAssignmentAccess();
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.RISK);
    List<UUID> riskTemplateIds = uniqueIds(changes);
    Map<UUID, CentralRiskTemplateEntity> destinationsById = riskTemplates.findAllById(riskTemplateIds).stream()
        .collect(Collectors.toMap(CentralRiskTemplateEntity::getId, Function.identity()));
    for (UUID id : riskTemplateIds) if (!destinationsById.containsKey(id)) throw endpointNotFound("Risk Template", id);
    Map<UUID, CentralRiskControlObjectiveAssignmentEntity> rowsByDestination = assignments.lockByBusinessKeys(controlObjective.getId(), riskTemplateIds)
        .stream().collect(Collectors.toMap(CentralRiskControlObjectiveAssignmentEntity::getRiskTemplateId, Function.identity()));
    ControlObjectiveEndpoint endpoint = new ControlObjectiveEndpoint(controlObjective.getId(), finalControlObjectiveStatus);
    List<PreparedMutation> mutations = new ArrayList<>();
    for (CentralRiskControlObjectiveAssignmentChangeRequest change : changes.stream().sorted(Comparator.comparing(CentralRiskControlObjectiveAssignmentChangeRequest::riskTemplateId)).toList()) {
      CentralRiskControlObjectiveAssignmentEntity existing = rowsByDestination.get(change.riskTemplateId());
      validateShape(change, existing);
      mutations.add(prepare(endpoint, destinationsById.get(change.riskTemplateId()), existing, change));
    }
    return new PreparedChanges(controlObjective.getId(), mutations.stream().filter(Objects::nonNull).toList(), context);
  }

  public ApplyResult apply(PreparedChanges prepared, CentralControlObjectiveEntity controlObjective) {
    if (!prepared.controlObjectiveId.equals(controlObjective.getId())) throw new IllegalStateException("Prepared assignments belong to another Control");
    UUID actor = users.getCurrentPrincipal().getUserId(); Instant now = Instant.now(clock);
    for (PreparedMutation mutation : prepared.mutations) apply(mutation, actor, now);
    if (!prepared.mutations.isEmpty()) assignments.saveAllAndFlush(prepared.mutations.stream().map(PreparedMutation::entity).toList());
    List<RevisionContentResult> contents = prepared.mutations.stream().map(mutation -> revisionContent(mutation, prepared.context)).toList();
    List<CentralRiskControlObjectiveAssignmentResponse> canonical = canView() ? canonicalRows(controlObjective) : List.of();
    return new ApplyResult(contents, canonical);
  }

  public List<CentralRiskControlObjectiveAssignmentResponse> canonicalRows(CentralControlObjectiveEntity controlObjective) {
    List<CentralRiskControlObjectiveAssignmentEntity> rows = assignments.findByControlObjectiveIdAndStatusNot(controlObjective.getId(), DELETED);
    Map<UUID, CentralRiskTemplateEntity> destinations = riskTemplates.findAllById(rows.stream().map(CentralRiskControlObjectiveAssignmentEntity::getRiskTemplateId).toList())
        .stream().collect(Collectors.toMap(CentralRiskTemplateEntity::getId, Function.identity()));
    return rows.stream().map(row -> mapper.response(row, controlObjective, requireDestination(destinations, row.getRiskTemplateId())))
        .sorted(Comparator.comparing(CentralRiskControlObjectiveAssignmentResponse::riskTemplateCode).thenComparing(CentralRiskControlObjectiveAssignmentResponse::assignmentId)).toList();
  }

  private PreparedMutation prepare(ControlObjectiveEndpoint controlObjective, CentralRiskTemplateEntity group,
      CentralRiskControlObjectiveAssignmentEntity existing, CentralRiskControlObjectiveAssignmentChangeRequest change) {
    return switch (change.operation()) {
      case CREATE_OR_RESTORE -> createOrRestore(controlObjective, group, existing, change.validFrom(), change.validTo());
      case UPDATE -> {
        CentralRiskControlObjectiveAssignmentEntity row = requireExisting(existing, change.riskTemplateId());
        requireAssignmentAccess(); requireNotDeleted(row); assertVersion(row, change.version());
        validateDates(change.validFrom(), change.validTo());
        MasterDataLifecycleStatus requested = change.requestedStatus() == null ? row.getStatus() : editableStatus(change.requestedStatus());
        if (requested != row.getStatus()) {

          RevisionOperationType lifecycle = requested == MasterDataLifecycleStatus.ACTIVE ? RevisionOperationType.ACTIVATE : RevisionOperationType.INACTIVATE;
          validateLifecycle(row, lifecycle); if (lifecycle == RevisionOperationType.ACTIVATE) requireActiveEndpoints(controlObjective, group);
        }
        if (Objects.equals(row.getValidFrom(), change.validFrom()) && Objects.equals(row.getValidTo(), change.validTo()) && requested == row.getStatus()) yield null;
        yield new PreparedMutation(row, RevisionOperationType.UPDATE, row.getVersion(), snapshot(row), change.validFrom(), change.validTo(), requested);
      }
      case ACTIVATE -> lifecycle(controlObjective, group, existing, change, RevisionOperationType.ACTIVATE);
      case INACTIVATE -> lifecycle(controlObjective, group, existing, change, RevisionOperationType.INACTIVATE);
      case DELETE -> lifecycle(controlObjective, group, existing, change, RevisionOperationType.DELETE);
      case RESTORE -> lifecycle(controlObjective, group, existing, change, RevisionOperationType.RESTORE);
    };
  }

  private PreparedMutation createOrRestore(ControlObjectiveEndpoint controlObjective, CentralRiskTemplateEntity group,
      CentralRiskControlObjectiveAssignmentEntity existing, LocalDate from, LocalDate to) {
    requireActiveEndpoints(controlObjective, group); validateDates(from, to);
    if (existing == null) {

      return new PreparedMutation(CentralRiskControlObjectiveAssignmentEntity.create(UUID.randomUUID(), controlObjective.id, group.getId(), from, to,
          users.getCurrentPrincipal().getUserId(), Instant.now(clock)), RevisionOperationType.CREATE, null, null, from, to, MasterDataLifecycleStatus.ACTIVE);
    }
    if (existing.getStatus() == MasterDataLifecycleStatus.ACTIVE) throw duplicate(controlObjective.id, group.getId());
    RevisionOperationType operation = existing.getStatus() == DELETED ? RevisionOperationType.RESTORE : RevisionOperationType.ACTIVATE;

    return new PreparedMutation(existing, operation, existing.getVersion(), snapshot(existing), from, to, MasterDataLifecycleStatus.ACTIVE);
  }

  private PreparedMutation lifecycle(ControlObjectiveEndpoint controlObjective, CentralRiskTemplateEntity group,
      CentralRiskControlObjectiveAssignmentEntity existing, CentralRiskControlObjectiveAssignmentChangeRequest change, RevisionOperationType operation) {
    CentralRiskControlObjectiveAssignmentEntity row = requireExisting(existing, change.riskTemplateId()); assertVersion(row, change.version()); validateLifecycle(row, operation);

    if (operation == RevisionOperationType.ACTIVATE || operation == RevisionOperationType.RESTORE) requireActiveEndpoints(controlObjective, group);
    return new PreparedMutation(row, operation, row.getVersion(), snapshot(row), row.getValidFrom(), row.getValidTo(), row.getStatus());
  }

  private void apply(PreparedMutation mutation, UUID actor, Instant now) {
    CentralRiskControlObjectiveAssignmentEntity row = mutation.entity;
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
    return RevisionContentResult.completed(RevisionEntityType.CENTRAL_RISK_CONTROL_OBJECTIVE_ASSIGNMENT, mutation.entity.getId(), mutation.operation,
        mutation.expectedVersion, mutation.before, snapshot(mutation.entity), mutation.entity.getVersion(),
        objectMapper.valueToTree(Map.of("validated", true, "hierarchyKeys", context.acquiredHierarchyKeys().stream().map(Enum::name).sorted().toList(),
            "lockOrder", "SORTED_GUARDS_CONTROL_RISK_TEMPLATE_CONTROL_OBJECTIVE_REQUIREMENT_ASSIGNMENTS")));
  }

  private List<UUID> uniqueIds(List<CentralRiskControlObjectiveAssignmentChangeRequest> changes) {
    Set<UUID> seen = new HashSet<>(); List<UUID> ids = new ArrayList<>();
    for (CentralRiskControlObjectiveAssignmentChangeRequest change : changes) {
      if (change == null || change.operation() == null || change.riskTemplateId() == null) throw invalidChange("Each assignment change requires operation and riskTemplateId");
      if (!seen.add(change.riskTemplateId())) throw invalidChange("Duplicate Risk Template operation in one aggregate request");
      ids.add(change.riskTemplateId());
    }
    ids.sort(UUID::compareTo); return ids;
  }

  private void validateShape(CentralRiskControlObjectiveAssignmentChangeRequest c, CentralRiskControlObjectiveAssignmentEntity existing) {
    boolean create = c.operation() == CentralRiskControlObjectiveAssignmentChangeOperation.CREATE_OR_RESTORE;
    if (create) {
      if (c.assignmentId() != null || c.version() != null || c.requestedStatus() != null) throw invalidChange("CREATE_OR_RESTORE accepts only riskTemplateId and validity fields");
      return;
    }
    if (c.assignmentId() == null || c.version() == null || c.version() < 0 || existing == null || !c.assignmentId().equals(existing.getId())) throw assignmentNotFound(c.assignmentId());
    if (c.operation() != CentralRiskControlObjectiveAssignmentChangeOperation.UPDATE && (c.validFrom() != null || c.validTo() != null || c.requestedStatus() != null)) throw invalidChange("Lifecycle operations must not carry update fields");
  }

  private void validateLifecycle(CentralRiskControlObjectiveAssignmentEntity row, RevisionOperationType op) {
    boolean valid = switch (op) { case ACTIVATE -> row.getStatus() == MasterDataLifecycleStatus.INACTIVE; case INACTIVATE -> row.getStatus() == MasterDataLifecycleStatus.ACTIVE; case DELETE -> row.getStatus() != DELETED; case RESTORE -> row.getStatus() == DELETED; default -> false; };
    if (!valid) throw new UnprocessableEntityException("INVALID_LIFECYCLE_TRANSITION", "error.masterdata.v2.invalidLifecycleTransition", "Invalid assignment lifecycle transition", row.getId());
  }
  private void requireActiveEndpoints(ControlObjectiveEndpoint controlObjective, CentralRiskTemplateEntity group) {
    if (controlObjective.status != MasterDataLifecycleStatus.ACTIVE) throw inactiveEndpoint("Control", controlObjective.id);
    if (group.getStatus() != MasterDataLifecycleStatus.ACTIVE) throw inactiveEndpoint("Risk Template", group.getId());
  }
  private void validateDates(LocalDate from, LocalDate to) { if (from != null && to != null && to.isBefore(from)) throw new UnprocessableEntityException("DATE_RANGE_INVALID", "error.masterdata.v2.invalidValidityRange", "Validity range is invalid"); }
  private MasterDataLifecycleStatus editableStatus(MasterDataLifecycleStatus status) { if (status == DELETED) throw invalidChange("UPDATE requestedStatus must be ACTIVE or INACTIVE"); return status; }
  private void assertVersion(CentralRiskControlObjectiveAssignmentEntity row, Long version) { if (version == null || row.getVersion() != version) throw new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict", "The assignment has changed", row.getId()); }
  private void requireNotDeleted(CentralRiskControlObjectiveAssignmentEntity row) { if (row.getStatus() == DELETED) throw new UnprocessableEntityException("INVALID_LIFECYCLE_TRANSITION", "error.masterdata.v2.invalidLifecycleTransition", "Deleted assignment cannot be updated", row.getId()); }
  private CentralRiskControlObjectiveAssignmentEntity requireExisting(CentralRiskControlObjectiveAssignmentEntity row, UUID id) { if (row == null) throw assignmentNotFound(id); return row; }
  private CentralRiskTemplateEntity requireDestination(Map<UUID, CentralRiskTemplateEntity> values, UUID id) { CentralRiskTemplateEntity value = values.get(id); if (value == null) throw endpointNotFound("Risk Template", id); return value; }

  public boolean canView() { return authorization.canView("CONTROL") && authorization.canView("RISK"); }
  private void requireAssignmentAccess() {
    authorization.requireManageWithReference("CONTROL", "RISK");
  }
  private JsonNode snapshot(CentralRiskControlObjectiveAssignmentEntity row) { Map<String,Object> v = new LinkedHashMap<>(); v.put("id", row.getId()); v.put("controlObjectiveId", row.getControlObjectiveId()); v.put("riskTemplateId", row.getRiskTemplateId()); v.put("status", row.getStatus().wireValue()); v.put("validFrom", row.getValidFrom()); v.put("validTo", row.getValidTo()); v.put("version", row.getVersion()); v.put("createdAt", row.getCreatedAt()); v.put("createdBy", row.getCreatedBy()); v.put("updatedAt", row.getUpdatedAt()); v.put("updatedBy", row.getUpdatedBy()); v.put("deletedAt", row.getDeletedAt()); v.put("deletedBy", row.getDeletedBy()); return objectMapper.valueToTree(v); }
  private ConflictException duplicate(UUID c, UUID g) { return new ConflictException("DUPLICATE_RELATION", "error.masterdata.centralAssignment.duplicate", "This exact central definition pair already has an active Assignment", c, g); }
  private NotFoundException assignmentNotFound(UUID id) { return new NotFoundException("CENTRAL_RISK_CONTROL_OBJECTIVE_ASSIGNMENT_NOT_FOUND", "error.masterdata.centralAssignment.notFound", "Control Risk Template assignment not found", id); }
  private NotFoundException endpointNotFound(String type, UUID id) { return new NotFoundException("RISK_CONTROL_OBJECTIVE_ASSIGNMENT_ENDPOINT_NOT_FOUND", "error.masterdata.centralAssignment.endpointNotFound", type + " endpoint not found", id); }
  private UnprocessableEntityException inactiveEndpoint(String type, UUID id) { return new UnprocessableEntityException("RISK_CONTROL_OBJECTIVE_ASSIGNMENT_ENDPOINT_NOT_ACTIVE", "error.masterdata.centralAssignment.endpointNotActive", type + " endpoint must be active", id); }
  private UnprocessableEntityException invalidChange(String message) { return new UnprocessableEntityException("RISK_CONTROL_OBJECTIVE_ASSIGNMENT_CHANGE_INVALID", "error.masterdata.centralAssignment.invalidChange", message); }

  private record ControlObjectiveEndpoint(UUID id, MasterDataLifecycleStatus status) {}
  private record PreparedMutation(CentralRiskControlObjectiveAssignmentEntity entity, RevisionOperationType operation,
      Long expectedVersion, JsonNode before, LocalDate validFrom, LocalDate validTo, MasterDataLifecycleStatus requestedStatus) {}
  public static final class PreparedChanges { private final UUID controlObjectiveId; private final List<PreparedMutation> mutations; private final RevisionExecutionContext context; private PreparedChanges(UUID controlObjectiveId, List<PreparedMutation> mutations, RevisionExecutionContext context) { this.controlObjectiveId = controlObjectiveId; this.mutations = List.copyOf(mutations); this.context = context; } public boolean changed() { return !mutations.isEmpty(); } }
  public record ApplyResult(List<RevisionContentResult> revisionContents, List<CentralRiskControlObjectiveAssignmentResponse> canonicalRows) { public ApplyResult { revisionContents = List.copyOf(revisionContents); canonicalRows = List.copyOf(canonicalRows); } }
}
