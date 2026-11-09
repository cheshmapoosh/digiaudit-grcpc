package com.digiaudit.grcpc.modules.masterdata.catalog.control.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.entity.CentralAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.api.dto.CentralAccountGroupDtos.ControlLifecycleChange;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CreateCentralControlRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.UpdateCentralControlRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlTriggerType;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.process.application.ProcessService;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto.CentralControlAccountGroupResponse;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto.AccountGroupControlSelection;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto.CentralControlAggregateMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.application.CentralControlAccountGroupAggregateService;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataStructuralDependencyChecker;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.application.CentralRiskControlAssignmentAggregateService;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.api.dto.CentralRiskControlAssignmentChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.api.dto.CentralRiskControlAssignmentChangeOperation;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.UpdateCentralRiskTemplateRequest.AssignmentOperation;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.UpdateCentralRiskTemplateRequest.ControlChange;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.api.dto.CentralRiskControlAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.application.CentralControlControlObjectiveAssignmentAggregateService;
import com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.api.dto.CentralControlControlObjectiveAssignmentChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.api.dto.CentralControlControlObjectiveAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.application.CentralRequirementControlAssignmentAggregateService;
import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.api.dto.CentralRequirementControlAssignmentChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.api.dto.CentralRequirementControlAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CentralControlResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.mapper.CentralControlMapper;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.HashMap;
import java.util.TreeSet;
import java.util.TreeMap;
import java.util.UUID;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CentralControlCommandService {
  private final CentralControlRepository repository;
  private final CentralControlGroupRepository groups;
  private final MasterDataRevisionCoordinator revisionCoordinator;
  private final MasterDataRevisionActorProvider actorProvider;
  private final DocumentCommandService documentCommandService;
  private final CatalogCommandSupport support;
  private final MasterDataStructuralDependencyChecker dependencyChecker;
  private final CentralRiskControlAssignmentAggregateService riskAssignments;
  private final CentralControlControlObjectiveAssignmentAggregateService controlObjectiveAssignments;
  private final CentralRequirementControlAssignmentAggregateService requirementAssignments;
  private final Clock clock;
  private final CentralControlMapper mapper;
  private final CentralControlAccountGroupAggregateService accountGroupClassifications;
  private final MasterDataAuthorizationService authorization;
  private final RevisionMutationGuard mutationGuard;
  private final ProcessService processes;

  public CentralControlCommandService(
      CentralControlRepository repository,
      CentralControlGroupRepository groups,
      MasterDataRevisionCoordinator revisionCoordinator,
      MasterDataRevisionActorProvider actorProvider,
      DocumentCommandService documentCommandService,
      CatalogCommandSupport support,
      MasterDataStructuralDependencyChecker dependencyChecker,
      CentralControlAccountGroupAggregateService accountGroupClassifications,
      MasterDataAuthorizationService authorization,
      RevisionMutationGuard mutationGuard,
      CentralRiskControlAssignmentAggregateService riskAssignments,
      CentralControlControlObjectiveAssignmentAggregateService controlObjectiveAssignments,
      CentralRequirementControlAssignmentAggregateService requirementAssignments,
      ProcessService processes,
      @Qualifier("masterDataRevisionClock") Clock clock, CentralControlMapper mapper) {
    this.repository = repository;
    this.groups = groups;
    this.revisionCoordinator = revisionCoordinator;
    this.actorProvider = actorProvider;
    this.documentCommandService = documentCommandService;
    this.support = support;
    this.dependencyChecker = dependencyChecker;
    this.accountGroupClassifications = accountGroupClassifications;
    this.authorization = authorization;
    this.mutationGuard = mutationGuard;
    this.riskAssignments = riskAssignments;
    this.controlObjectiveAssignments = controlObjectiveAssignments;
    this.requirementAssignments = requirementAssignments;
    this.processes = processes;
    this.clock = clock;
    this.mapper = mapper;
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public List<AccountGroupControlChange> lockAccountGroupChanges(RevisionExecutionContext context,
      List<AccountGroupControlSelection> selections, List<ControlLifecycleChange> changes) {
    if ((selections == null || selections.isEmpty()) && (changes == null || changes.isEmpty())) return List.of();
    mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.ACCOUNT_GROUP);
    mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.CONTROL);
    authorization.requireManageWithReference("CONTROL", "REFERENCE");
    Map<UUID, Long> versions = new HashMap<>();
    for (AccountGroupControlSelection selection : selections == null ? List.<AccountGroupControlSelection>of() : selections) {
      long version = support.requireVersion(selection.version());
      if (versions.putIfAbsent(selection.controlId(), version) != null) {
        throw duplicateAccountGroupChange();
      }
    }
    Map<UUID, ControlLifecycleChange> lifecycle = new HashMap<>();
    for (ControlLifecycleChange change : changes == null ? List.<ControlLifecycleChange>of() : changes) {
      if (versions.containsKey(change.controlId()) || lifecycle.putIfAbsent(change.controlId(), change) != null) {
        throw duplicateAccountGroupChange();
      }
    }
    var ids = new TreeSet<>(versions.keySet());
    ids.addAll(lifecycle.keySet());
    List<AccountGroupControlChange> locked = new ArrayList<>();
    for (UUID id : ids) {
      CentralControlEntity control = repository.lockById(id).orElseThrow(() ->
          new NotFoundException("CONTROL_ACCOUNT_GROUP_ENDPOINT_NOT_FOUND",
              "error.masterdata.controlAccountGroup.endpointNotFound", "Control not found", id));
      if (versions.containsKey(id)) support.assertVersion(control, versions.get(id));
      locked.add(new AccountGroupControlChange(control, lifecycle.get(id)));
    }
    return locked;
  }

  private UnprocessableEntityException duplicateAccountGroupChange() {
    return new UnprocessableEntityException("CONTROL_ACCOUNT_GROUP_CHANGE_INVALID",
        "error.masterdata.controlAccountGroup.invalidChange", "Duplicate Control in Account Group changes");
  }

  public record AccountGroupControlChange(CentralControlEntity control, ControlLifecycleChange lifecycle) {}

  @Transactional(propagation = Propagation.MANDATORY)
  public List<RevisionContentResult> applyAccountGroupChanges(RevisionExecutionContext context,
      CentralAccountGroupEntity group, List<AccountGroupControlChange> changes) {
    List<RevisionContentResult> contents = new ArrayList<>();
    for (AccountGroupControlChange change : changes) {
      CentralControlEntity control = change.control();
      long version = control.getVersion();
      JsonNode before = snapshot(control);
      RevisionContentResult classification =
          accountGroupClassifications.changeFromAccountGroup(context, control, group, change.lifecycle());
      control.accountGroupClassificationsChanged(actorProvider.currentActorId(), Instant.now(clock));
      CentralControlEntity saved = repository.saveAndFlush(control);
      contents.addAll(completed(context, saved, RevisionOperationType.UPDATE, version, before).contentResults());
      contents.add(classification);
    }
    return contents;
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public List<RiskTemplateControlChange> lockRiskTemplateChanges(
      RevisionExecutionContext context, List<ControlChange> changes) {
    if (changes == null || changes.isEmpty()) return List.of();
    mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.CONTROL);
    mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.RISK);
    authorization.requireManageWithReference("CONTROL", "RISK");
    var ordered = new TreeMap<UUID, ControlChange>();
    for (var change : changes) {
      if (ordered.putIfAbsent(change.controlId(), change) != null) {
        throw new UnprocessableEntityException("ASSIGNMENT_CHANGE_INVALID",
            "error.masterdata.centralAssignment.invalidChange", "Duplicate Control in Risk Template changes");
      }
    }
    List<RiskTemplateControlChange> locked = new ArrayList<>();
    for (var change : ordered.values()) {
      var target = lock(change.controlId());
      target.requireNotDeleted();
      if (change.operation() == AssignmentOperation.CREATE_OR_RESTORE) {
        support.assertVersion(target, support.requireVersion(change.controlVersion()));
      }
      locked.add(new RiskTemplateControlChange(target, change));
    }
    return locked;
  }

  public record RiskTemplateControlChange(CentralControlEntity target, ControlChange change) {}

  @Transactional(propagation = Propagation.MANDATORY)
  public List<RevisionContentResult> applyRiskTemplateChanges(
      RevisionExecutionContext context, UUID riskTemplateId, List<RiskTemplateControlChange> changes) {
    List<RevisionContentResult> contents = new ArrayList<>();
    for (var locked : changes) {
      var target = locked.target();
      var change = locked.change();
      var operation = CentralRiskControlAssignmentChangeOperation.valueOf(change.operation().name());
      var prepared = riskAssignments.prepareFromRiskTemplate(context, target,
          new CentralRiskControlAssignmentChangeRequest(operation, riskTemplateId,
              change.assignmentId(), change.version(), null, null, null));
      long version = target.getVersion();
      JsonNode before = snapshot(target);
      target.riskAssignmentsChanged(actorProvider.currentActorId(), Instant.now(clock));
      var saved = repository.saveAndFlush(target);
      contents.addAll(completed(context, saved, RevisionOperationType.UPDATE, version, before).contentResults());
      contents.addAll(riskAssignments.applyChanges(prepared, saved));
    }
    return contents;
  }

  public CentralControlAggregateMutationResponse create(CreateCentralControlRequest request) {
    String code = support.normalizeCode(request.code());
    String title = support.normalizeTitle(request.title());
    String description = support.normalizeDescription(request.description());
    String eventDescription = support.normalizeDescription(request.eventDescription());
    validateDefinition(request.triggerType(), eventDescription, request.operationFrequency());
    support.validateValidity(request.validFrom(), request.validTo());
    if (request.initialSubprocess() != null && request.controlGroupId() == null) {
      throw new UnprocessableEntityException(
          "INVALID_PARENT", "error.masterdata.v2.invalidParent", "A Control Group is required");
    }
    AtomicReference<CentralControlResponse> canonicalEntity = new AtomicReference<>();
    AtomicReference<List<DocumentCommandResponse>> documents = new AtomicReference<>(List.of());
    AtomicReference<List<CentralRiskControlAssignmentResponse>> canonicalRiskAssignments = new AtomicReference<>(List.of());
    AtomicReference<List<CentralControlControlObjectiveAssignmentResponse>> canonicalControlObjectiveAssignments = new AtomicReference<>(List.of());
    AtomicReference<List<CentralRequirementControlAssignmentResponse>> canonicalRequirementAssignments = new AtomicReference<>(List.of());
    AtomicReference<List<CentralControlAccountGroupResponse>> canonicalClassifications = new AtomicReference<>(List.of());

    try {
      RevisionExecutionResult result =
          revisionCoordinator.executeStructural(
              createGuards(request),
              RevisionRequest.central(
                  "Create central control " + code, "Central Control definition create", null),
              context -> {
                DocumentCommandService.PreparedAggregateContext prepared =
                    documentCommandService.prepareAggregate(request.documents());
                CentralControlEntity entity = repository.findByCode(code).orElse(null);
                if (entity != null) entity = lock(entity.getId());
                lockAssignmentEndpoints(context, request);
                validateControlGroup(request.controlGroupId());
                RevisionOperationType operationType;
                Long expectedVersion;
                JsonNode before;
                UUID actorId = actorProvider.currentActorId();
                Instant now = Instant.now(clock);

                if (entity == null) {
                  entity =
                      CentralControlEntity.create(
                          UUID.randomUUID(),
                          code,
                          title,
                          description,
                          request.controlGroupId(),
                          request.controlClass(),
                          request.importance(),
                          request.controlRisk(),
                          request.automationType(),
                          request.controlPurpose(),
                          request.nature(),
                          request.controlRelevance(),
                          request.triggerType(),
                          eventDescription,
                          request.operationFrequency(),
                          request.toBeTested(),
                          request.testAutomationType(),
                          request.testingTechnique(),
                          request.evidenceLevel(),
                          request.validFrom(),
                          request.validTo(),
                          actorId,
                          now);
                  operationType = RevisionOperationType.CREATE;
                  expectedVersion = null;
                  before = null;
                } else {
                  if (entity.getStatus() == MasterDataLifecycleStatus.ACTIVE) {
                    throw support.duplicate(code);
                  }
                  before = snapshot(entity);
                  expectedVersion = entity.getVersion();
                  if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) {
                    entity.restoreFromCreate(
                        title,
                        description,
                        request.controlGroupId(),
                        request.controlClass(),
                        request.importance(),
                        request.controlRisk(),
                        request.automationType(),
                        request.controlPurpose(),
                        request.nature(),
                        request.controlRelevance(),
                        request.triggerType(),
                        eventDescription,
                        request.operationFrequency(),
                        request.toBeTested(),
                        request.testAutomationType(),
                        request.testingTechnique(),
                        request.evidenceLevel(),
                        request.validFrom(),
                        request.validTo(),
                        actorId,
                        now);
                    operationType = RevisionOperationType.RESTORE;
                  } else {
                    entity.reactivateFromCreate(
                        title,
                        description,
                        request.controlGroupId(),
                        request.controlClass(),
                        request.importance(),
                        request.controlRisk(),
                        request.automationType(),
                        request.controlPurpose(),
                        request.nature(),
                        request.controlRelevance(),
                        request.triggerType(),
                        eventDescription,
                        request.operationFrequency(),
                        request.toBeTested(),
                        request.testAutomationType(),
                        request.testingTechnique(),
                        request.evidenceLevel(),
                        request.validFrom(),
                        request.validTo(),
                        actorId,
                        now);
                    operationType = RevisionOperationType.ACTIVATE;
                  }
                }

                CentralControlAccountGroupAggregateService.PreparedChanges preparedClassifications =
                    accountGroupClassifications.prepare(context, entity, MasterDataLifecycleStatus.ACTIVE, request.accountGroupChanges());
                CentralRiskControlAssignmentAggregateService.PreparedChanges preparedRiskAssignments =
                    riskAssignments.prepare(context, entity, MasterDataLifecycleStatus.ACTIVE, request.riskAssignments());
                CentralControlControlObjectiveAssignmentAggregateService.PreparedChanges preparedControlObjectiveAssignments =
                    controlObjectiveAssignments.prepare(context, entity, MasterDataLifecycleStatus.ACTIVE, request.controlObjectiveAssignments());
                CentralRequirementControlAssignmentAggregateService.PreparedChanges preparedRequirementAssignments =
                    requirementAssignments.prepare(context, entity, MasterDataLifecycleStatus.ACTIVE, request.requirementAssignments());
                CentralControlEntity saved = repository.saveAndFlush(entity);
                canonicalEntity.set(mapper.toResponse(saved));
                var subprocessContents = request.initialSubprocess() == null
                    ? List.<com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult>of()
                    : processes.attachCreatedControl(context, request.initialSubprocess().subprocessId(),
                        request.initialSubprocess().version(), saved).contentResults();
                documents.set(
                    documentCommandService.finalizePreparedAggregate(
                        prepared,
                        DocumentLinkTargetType.CENTRAL_CONTROL,
                        saved.getId(),
                        "MD_CONTROL_MANAGE"));
                CentralControlAccountGroupAggregateService.ApplyResult classificationResult =
                    accountGroupClassifications.apply(preparedClassifications, saved);
                canonicalClassifications.set(classificationResult.canonicalRows());
                CentralRiskControlAssignmentAggregateService.ApplyResult riskAssignmentsResult = riskAssignments.apply(preparedRiskAssignments, saved);
                canonicalRiskAssignments.set(riskAssignmentsResult.canonicalRows());
                CentralControlControlObjectiveAssignmentAggregateService.ApplyResult controlObjectiveAssignmentsResult = controlObjectiveAssignments.apply(preparedControlObjectiveAssignments, saved);
                canonicalControlObjectiveAssignments.set(controlObjectiveAssignmentsResult.canonicalRows());
                CentralRequirementControlAssignmentAggregateService.ApplyResult requirementAssignmentsResult = requirementAssignments.apply(preparedRequirementAssignments, saved);
                canonicalRequirementAssignments.set(requirementAssignmentsResult.canonicalRows());
                return combine(context, completed(context, saved, operationType, expectedVersion, before), classificationResult.revisionContents(), riskAssignmentsResult.revisionContents(), controlObjectiveAssignmentsResult.revisionContents(), requirementAssignmentsResult.revisionContents(), subprocessContents);
              });
      return aggregateResponse(result, documents.get(), canonicalClassifications.get(), canonicalRiskAssignments.get(), canonicalControlObjectiveAssignments.get(), canonicalRequirementAssignments.get(), canonicalEntity.get());
    } catch (DataIntegrityViolationException exception) {
      throw support.translateBusinessKeyViolation(exception, "UK_CENTRAL_CONTROL_CODE", code);
    }
  }

  public CentralControlAggregateMutationResponse update(UUID id, UpdateCentralControlRequest request) {
    long expectedVersion = support.requireVersion(request.version());
    String title = support.normalizeTitle(request.title());
    String description = support.normalizeDescription(request.description());
    String eventDescription = support.normalizeDescription(request.eventDescription());
    MasterDataLifecycleStatus requestedStatus = requireEditableStatus(request.status());
    validateDefinition(request.triggerType(), eventDescription, request.operationFrequency());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<CentralControlResponse> canonicalEntity = new AtomicReference<>();
    AtomicReference<List<DocumentCommandResponse>> documents = new AtomicReference<>(List.of());
    AtomicReference<List<CentralRiskControlAssignmentResponse>> canonicalRiskAssignments = new AtomicReference<>(List.of());
    AtomicReference<List<CentralControlControlObjectiveAssignmentResponse>> canonicalControlObjectiveAssignments = new AtomicReference<>(List.of());
    AtomicReference<List<CentralRequirementControlAssignmentResponse>> canonicalRequirementAssignments = new AtomicReference<>(List.of());
    AtomicReference<List<CentralControlAccountGroupResponse>> canonicalClassifications = new AtomicReference<>(List.of());

    RevisionExecutionResult result =
        revisionCoordinator.executeStructural(
            requiredGuards(request.accountGroupChanges(), request.riskAssignments(), request.controlObjectiveAssignments(), request.requirementAssignments()),
            RevisionRequest.central(
                "Update central control " + id, "Central Control definition update", null),
            context -> {
              DocumentCommandService.PreparedAggregateContext prepared =
                  documentCommandService.prepareAggregate(request.documents());
              CentralControlEntity entity = lock(id);
              support.assertVersion(entity, expectedVersion);
              if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
              lockAssignmentEndpoints(context, request);
              validateControlGroup(request.controlGroupId());
              JsonNode before = snapshot(entity);
              CentralControlAccountGroupAggregateService.PreparedChanges preparedClassifications =
                  accountGroupClassifications.prepare(context, entity, requestedStatus, request.accountGroupChanges());
              CentralRiskControlAssignmentAggregateService.PreparedChanges preparedRiskAssignments =
                  riskAssignments.prepare(context, entity, requestedStatus, request.riskAssignments());
              CentralControlControlObjectiveAssignmentAggregateService.PreparedChanges preparedControlObjectiveAssignments =
                  controlObjectiveAssignments.prepare(context, entity, requestedStatus, request.controlObjectiveAssignments());
              CentralRequirementControlAssignmentAggregateService.PreparedChanges preparedRequirementAssignments =
                  requirementAssignments.prepare(context, entity, requestedStatus, request.requirementAssignments());
              if (sameDefinition(entity, title, description, eventDescription, requestedStatus, request)
                  && isEmpty(request.documents()) && isEmpty(request.accountGroupChanges()) && !preparedRiskAssignments.changed() && !preparedControlObjectiveAssignments.changed() && !preparedRequirementAssignments.changed()) {
                throw new UnprocessableEntityException(
                    "NO_CHANGE", "error.masterdata.v2.noChange", "The command contains no change");
              }

              UUID actorId = actorProvider.currentActorId();
              Instant now = Instant.now(clock);
              entity.update(
                  title,
                  description,
                  request.controlGroupId(),
                  request.controlClass(),
                  request.importance(),
                  request.controlRisk(),
                  request.automationType(),
                  request.controlPurpose(),
                  request.nature(),
                  request.controlRelevance(),
                  request.triggerType(),
                  eventDescription,
                  request.operationFrequency(),
                  request.toBeTested(),
                  request.testAutomationType(),
                  request.testingTechnique(),
                  request.evidenceLevel(),
                  request.validFrom(),
                  request.validTo(),
                  actorId,
                  now);
              if (entity.getStatus() != requestedStatus) {
                if (requestedStatus == MasterDataLifecycleStatus.ACTIVE) entity.activate(actorId, now);
                else entity.inactivate(actorId, now);
              }
              CentralControlEntity saved = repository.saveAndFlush(entity);
                canonicalEntity.set(mapper.toResponse(saved));
              documents.set(
                  documentCommandService.finalizePreparedAggregate(
                      prepared,
                      DocumentLinkTargetType.CENTRAL_CONTROL,
                      saved.getId(),
                      "MD_CONTROL_MANAGE"));
              CentralControlAccountGroupAggregateService.ApplyResult classificationResult =
                  accountGroupClassifications.apply(preparedClassifications, saved);
              canonicalClassifications.set(classificationResult.canonicalRows());
              CentralRiskControlAssignmentAggregateService.ApplyResult riskAssignmentsResult = riskAssignments.apply(preparedRiskAssignments, saved);
              canonicalRiskAssignments.set(riskAssignmentsResult.canonicalRows());
              CentralControlControlObjectiveAssignmentAggregateService.ApplyResult controlObjectiveAssignmentsResult = controlObjectiveAssignments.apply(preparedControlObjectiveAssignments, saved);
              canonicalControlObjectiveAssignments.set(controlObjectiveAssignmentsResult.canonicalRows());
              CentralRequirementControlAssignmentAggregateService.ApplyResult requirementAssignmentsResult = requirementAssignments.apply(preparedRequirementAssignments, saved);
              canonicalRequirementAssignments.set(requirementAssignmentsResult.canonicalRows());
              return combine(context, completed(context, saved, RevisionOperationType.UPDATE, expectedVersion, before), classificationResult.revisionContents(), riskAssignmentsResult.revisionContents(), controlObjectiveAssignmentsResult.revisionContents(), requirementAssignmentsResult.revisionContents());
            });
    return aggregateResponse(result, documents.get(), canonicalClassifications.get(), canonicalRiskAssignments.get(), canonicalControlObjectiveAssignments.get(), canonicalRequirementAssignments.get(), canonicalEntity.get());
  }

  public MasterDataRevisionMutationResponse activate(UUID id, Long version) {
    return lifecycle(id, version, RevisionOperationType.ACTIVATE);
  }

  public MasterDataRevisionMutationResponse inactivate(UUID id, Long version) {
    return lifecycle(id, version, RevisionOperationType.INACTIVATE);
  }

  public MasterDataRevisionMutationResponse delete(UUID id, Long version) {
    return lifecycle(id, version, RevisionOperationType.DELETE);
  }

  public MasterDataRevisionMutationResponse restore(UUID id, Long version) {
    return lifecycle(id, version, RevisionOperationType.RESTORE);
  }

  private MasterDataRevisionMutationResponse lifecycle(
      UUID id, Long requestedVersion, RevisionOperationType operationType) {
    long expectedVersion = support.requireVersion(requestedVersion);
    RevisionExecutionResult result =
        revisionCoordinator.executeStructural(
            List.of(MasterDataHierarchyKey.ACCOUNT_GROUP, MasterDataHierarchyKey.CONTROL, MasterDataHierarchyKey.REGULATION, MasterDataHierarchyKey.RISK),
            RevisionRequest.central(
                operationType + " central control " + id,
                "Central Control lifecycle command",
                null),
            context -> {
              CentralControlEntity entity = lock(id);
              support.assertVersion(entity, expectedVersion);
              support.validateLifecycle(entity, operationType);
              if (operationType == RevisionOperationType.DELETE
                  && dependencyChecker.centralControlHasApprovedDependencies(id)) {
                throw new ConflictException(
                    "DEPENDENCY_EXISTS",
                    "error.masterdata.v2.dependencyExists",
                    "Control has approved structural dependencies",
                    id);
              }
              JsonNode before = snapshot(entity);
              UUID actorId = actorProvider.currentActorId();
              Instant now = Instant.now(clock);
              switch (operationType) {
                case ACTIVATE -> entity.activate(actorId, now);
                case INACTIVATE -> entity.inactivate(actorId, now);
                case DELETE -> entity.delete(actorId, now);
                case RESTORE -> entity.restore(actorId, now);
                default -> throw new IllegalArgumentException("Unsupported lifecycle operation");
              }
              return completed(
                  context, repository.saveAndFlush(entity), operationType, expectedVersion, before);
            });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  private void lockAssignmentEndpoints(RevisionExecutionContext context, CreateCentralControlRequest request) {
    riskAssignments.lockEndpoints(context, request.riskAssignments());
    controlObjectiveAssignments.lockEndpoints(context, request.controlObjectiveAssignments());
    requirementAssignments.lockEndpoints(context, request.requirementAssignments());
  }

  private void lockAssignmentEndpoints(RevisionExecutionContext context, UpdateCentralControlRequest request) {
    riskAssignments.lockEndpoints(context, request.riskAssignments());
    controlObjectiveAssignments.lockEndpoints(context, request.controlObjectiveAssignments());
    requirementAssignments.lockEndpoints(context, request.requirementAssignments());
  }

  private void validateDefinition(
      CentralControlTriggerType triggerType,
      String eventDescription,
      Object operationFrequency) {
    if (eventDescription != null && triggerType != CentralControlTriggerType.EVENT) {
      throw new UnprocessableEntityException(
          "INVALID_CONTROL_EVENT_DESCRIPTION",
          "error.masterdata.v2.invalidControlEventDescription",
          "Event description is only valid for EVENT trigger");
    }
    if (operationFrequency != null && triggerType != CentralControlTriggerType.DATE) {
      throw new UnprocessableEntityException(
          "INVALID_CONTROL_FREQUENCY",
          "error.masterdata.v2.invalidControlFrequency",
          "Operation frequency is only valid for DATE trigger");
    }
  }

  private void validateControlGroup(UUID controlGroupId) {
    if (controlGroupId == null || groups.findByIdAndStatusNot(controlGroupId, MasterDataLifecycleStatus.DELETED).isEmpty()) {
      throw new UnprocessableEntityException(
          "INVALID_PARENT",
          "error.masterdata.v2.invalidParent",
          "Control Group does not exist or is deleted");
    }
  }

  private List<MasterDataHierarchyKey> requiredGuards(List<?> classifications, List<CentralRiskControlAssignmentChangeRequest> riskAssignments, List<CentralControlControlObjectiveAssignmentChangeRequest> controlObjectiveAssignments, List<CentralRequirementControlAssignmentChangeRequest> requirementAssignments) {
    var keys = new java.util.TreeSet<MasterDataHierarchyKey>(java.util.Comparator.comparing(Enum::name));
    keys.add(MasterDataHierarchyKey.CONTROL);
    if (!isEmpty(classifications)) keys.add(MasterDataHierarchyKey.ACCOUNT_GROUP);
    if (!isEmpty(riskAssignments)) keys.addAll(List.of(MasterDataHierarchyKey.CONTROL, MasterDataHierarchyKey.RISK));
    if (!isEmpty(controlObjectiveAssignments)) keys.addAll(List.of(MasterDataHierarchyKey.CONTROL));
    if (!isEmpty(requirementAssignments)) keys.addAll(List.of(MasterDataHierarchyKey.CONTROL, MasterDataHierarchyKey.REGULATION));
    return List.copyOf(keys);
  }

  private List<MasterDataHierarchyKey> createGuards(CreateCentralControlRequest request) {
    var keys = new java.util.TreeSet<MasterDataHierarchyKey>(java.util.Comparator.comparing(Enum::name));
    keys.addAll(requiredGuards(request.accountGroupChanges(), request.riskAssignments(),
        request.controlObjectiveAssignments(), request.requirementAssignments()));
    if (request.initialSubprocess() != null) keys.add(MasterDataHierarchyKey.PROCESS);
    return List.copyOf(keys);
  }

  @SafeVarargs
  private final RevisionOperationResult combine(RevisionExecutionContext context, RevisionOperationResult primary,
      List<com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult>... relationContents) {
    var contents = new ArrayList<>(primary.contentResults());
    for (var relations : relationContents) contents.addAll(relations);
    return RevisionOperationResult.completed(context, primary.primaryResult(), contents);
  }

  private CentralControlAggregateMutationResponse aggregateResponse(RevisionExecutionResult result,
      List<DocumentCommandResponse> documents, List<CentralControlAccountGroupResponse> classifications,
      List<CentralRiskControlAssignmentResponse> riskAssignments,
      List<CentralControlControlObjectiveAssignmentResponse> controlObjectiveAssignments,
      List<CentralRequirementControlAssignmentResponse> requirementAssignments, CentralControlResponse entity) {
    var primary = result.primaryResult();
    return new CentralControlAggregateMutationResponse(primary.entityId(), primary.revisionId(), primary.version(), documents, classifications, riskAssignments, controlObjectiveAssignments, requirementAssignments, entity);
  }

  private RevisionOperationResult completed(
      RevisionExecutionContext context,
      CentralControlEntity entity,
      RevisionOperationType operationType,
      Long expectedVersion,
      JsonNode before) {
    return support.completed(
        context,
        entity,
        RevisionEntityType.CENTRAL_CONTROL,
        operationType,
        expectedVersion,
        before,
        typedFields(entity));
  }

  private JsonNode snapshot(CentralControlEntity entity) {
    return support.snapshot(entity, typedFields(entity));
  }

  private Map<String, Object> typedFields(CentralControlEntity entity) {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("controlGroupId", entity.getControlGroupId());
    fields.put("controlClass", entity.getControlClass());
    fields.put("importance", entity.getImportance());
    fields.put("controlRisk", entity.getControlRisk());
    fields.put("automationType", entity.getAutomationType());
    fields.put("controlPurpose", entity.getControlPurpose());
    fields.put("nature", entity.getNature());
    fields.put("controlRelevance", entity.getControlRelevance());
    fields.put("triggerType", entity.getTriggerType());
    fields.put("eventDescription", entity.getEventDescription());
    fields.put("operationFrequency", entity.getOperationFrequency());
    fields.put("toBeTested", entity.getToBeTested());
    fields.put("testAutomationType", entity.getTestAutomationType());
    fields.put("testingTechnique", entity.getTestingTechnique());
    fields.put("evidenceLevel", entity.getEvidenceLevel());
    return fields;
  }

  private CentralControlEntity lock(UUID id) {
    return repository.lockById(id).orElseThrow(() -> notFound(id));
  }

  private NotFoundException notFound(UUID id) {
    return new NotFoundException(
        "MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound", "Control not found", id);
  }

  private MasterDataLifecycleStatus requireEditableStatus(MasterDataLifecycleStatus status) {
    if (status == null || status == MasterDataLifecycleStatus.DELETED) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_TRANSITION",
          "error.masterdata.v2.invalidLifecycleTransition",
          "Control edit status must be ACTIVE or INACTIVE");
    }
    return status;
  }

  private boolean sameDefinition(
      CentralControlEntity entity,
      String title,
      String description,
      String eventDescription,
      MasterDataLifecycleStatus requestedStatus,
      UpdateCentralControlRequest request) {
    return Objects.equals(entity.getTitle(), title)
        && Objects.equals(entity.getDescription(), description)
        && Objects.equals(entity.getControlGroupId(), request.controlGroupId())
        && Objects.equals(entity.getControlClass(), request.controlClass())
        && Objects.equals(entity.getImportance(), request.importance())
        && Objects.equals(entity.getControlRisk(), request.controlRisk())
        && Objects.equals(entity.getAutomationType(), request.automationType())
        && Objects.equals(entity.getControlPurpose(), request.controlPurpose())
        && Objects.equals(entity.getNature(), request.nature())
        && Objects.equals(
            entity.getControlRelevance(),
            request.controlRelevance() == null ? java.util.Set.of() : request.controlRelevance())
        && Objects.equals(entity.getTriggerType(), request.triggerType())
        && Objects.equals(entity.getEventDescription(), eventDescription)
        && Objects.equals(entity.getOperationFrequency(), request.operationFrequency())
        && Objects.equals(entity.getToBeTested(), request.toBeTested())
        && Objects.equals(entity.getTestAutomationType(), request.testAutomationType())
        && Objects.equals(entity.getTestingTechnique(), request.testingTechnique())
        && Objects.equals(entity.getEvidenceLevel(), request.evidenceLevel())
        && entity.getStatus() == requestedStatus
        && Objects.equals(entity.getValidFrom(), request.validFrom())
        && Objects.equals(entity.getValidTo(), request.validTo());
  }

  private boolean isEmpty(DocumentAggregateBatchRequest request) {
    return request == null
        || (request.newDocuments().isEmpty()
            && request.newVersions().isEmpty()
            && request.metadataUpdates().isEmpty());
  }

  private boolean isEmpty(List<?> values) { return values == null || values.isEmpty(); }
}
