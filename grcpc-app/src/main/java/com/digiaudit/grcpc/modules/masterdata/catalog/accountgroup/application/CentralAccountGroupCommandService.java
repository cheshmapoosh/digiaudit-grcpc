package com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.masterdata.assignment.accountgrouprisk.api.dto.AccountGroupRiskAssignmentDtos;
import com.digiaudit.grcpc.modules.masterdata.assignment.accountgrouprisk.application.CentralAccountGroupRiskAssignmentService;
import com.digiaudit.grcpc.modules.masterdata.assignment.accountgrouprisk.application.CentralAccountGroupRiskAssignmentService.LockedChange;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.api.dto.CentralAccountGroupDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.entity.CentralAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.repository.CentralAccountGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogHierarchySupport;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.application.CentralControlCommandService;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.application.CentralControlCommandService.AccountGroupControlChange;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.application.CentralControlObjectiveCommandService;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.application.CentralControlObjectiveCommandService.AccountGroupControlObjectiveChange;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto.AccountGroupControlSelection;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto.CentralControlAccountGroupResponse;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.application.CentralControlAccountGroupQueryService;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto.CentralControlObjectiveAccountGroupResponse;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.application.CentralControlObjectiveAccountGroupQueryService;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataStructuralDependencyChecker;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.api.mapper.CentralAccountGroupMapper;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Clock;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class CentralAccountGroupCommandService {
  private final CentralAccountGroupRepository repository;
  private final MasterDataRevisionCoordinator revisions;
  private final MasterDataRevisionActorProvider actors;
  private final RevisionMutationGuard mutationGuard;
  private final DocumentCommandService documents;
  private final CatalogCommandSupport support;
  private final CatalogHierarchySupport hierarchySupport;
  private final MasterDataStructuralDependencyChecker dependencyChecker;
  private final Clock clock;
  private final CentralAccountGroupMapper mapper;
  private final CentralControlCommandService controlCommands;
  private final CentralControlAccountGroupQueryService controlClassifications;
  private final CentralControlObjectiveCommandService controlObjectiveCommands;
  private final CentralControlObjectiveAccountGroupQueryService controlObjectiveClassifications;
  private final CentralAccountGroupRiskAssignmentService riskAssignments;

  public CentralAccountGroupCommandService(
      CentralAccountGroupRepository repository,
      MasterDataRevisionCoordinator revisions,
      MasterDataRevisionActorProvider actors,
      RevisionMutationGuard mutationGuard,
      DocumentCommandService documents,
      CatalogCommandSupport support,
      CatalogHierarchySupport hierarchySupport,
      MasterDataStructuralDependencyChecker dependencyChecker,
      CentralControlCommandService controlCommands,
      CentralControlAccountGroupQueryService controlClassifications,
      CentralControlObjectiveCommandService controlObjectiveCommands,
      CentralControlObjectiveAccountGroupQueryService controlObjectiveClassifications,
      CentralAccountGroupRiskAssignmentService riskAssignments,
      @Qualifier("masterDataRevisionClock") Clock clock, CentralAccountGroupMapper mapper) {
    this.repository = repository;
    this.revisions = revisions;
    this.actors = actors;
    this.mutationGuard = mutationGuard;
    this.documents = documents;
    this.support = support;
    this.hierarchySupport = hierarchySupport;
    this.dependencyChecker = dependencyChecker;
    this.clock = clock;
    this.mapper = mapper;
    this.controlCommands = controlCommands;
    this.controlClassifications = controlClassifications;
    this.controlObjectiveCommands = controlObjectiveCommands;
    this.controlObjectiveClassifications = controlObjectiveClassifications;
    this.riskAssignments = riskAssignments;
  }

  public CentralAccountGroupDtos.AggregateResponse create(CentralAccountGroupDtos.Create request) {
    String code = support.normalizeCode(request.code()),
        title = support.normalizeTitle(request.title()),
        description = support.normalizeDescription(request.description());
    int sortOrder = support.normalizeSortOrder(request.sortOrder());
    boolean reasonableAssurance = Boolean.TRUE.equals(request.reasonableAssurance());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<CentralAccountGroupDtos.Detail> canonical = new AtomicReference<>();
    AtomicReference<List<DocumentCommandResponse>> finalized = new AtomicReference<>(List.of());
    AtomicReference<List<CentralControlAccountGroupResponse>> canonicalControls = new AtomicReference<>();
    AtomicReference<List<CentralControlObjectiveAccountGroupResponse>> canonicalObjectives = new AtomicReference<>();
    AtomicReference<List<AccountGroupRiskAssignmentDtos.Response>> canonicalRisks = new AtomicReference<>();
    try {
      RevisionExecutionResult result =
          revisions.executeStructural(
              guardsForSave(request.controlsToAdd(), null, request.riskTemplatesToAdd(), null),
              RevisionRequest.central(
                  "Create account group " + code, "Account Group structural create", null),
              context -> {
                requireGuard(context);
                var prepared = documents.prepareAggregate(request.documents());
                var selectedControls = controlCommands.lockAccountGroupChanges(context, request.controlsToAdd(), null);
                var selectedRisks = riskAssignments.lockEndpoints(context, request.riskTemplatesToAdd(), null);
                var selectedObjectives = controlObjectiveCommands.lockAccountGroupChanges(context, request.controlObjectivesToAdd(), null);
                var hierarchy = hierarchy();
                CentralAccountGroupEntity entity = repository.findByCode(code).orElse(null);
                UUID id = entity == null ? UUID.randomUUID() : entity.getId();
                hierarchySupport.requireParent(
                    id, request.parentAccountGroupId(), hierarchy, "Account Group parent");
                hierarchySupport.rejectCycle(
                    id,
                    request.parentAccountGroupId(),
                    hierarchy,
                    CentralAccountGroupEntity::getParentAccountGroupId);
                RevisionOperationType operation;
                Long expected;
                JsonNode before;
                UUID actor = actors.currentActorId();
                Instant now = Instant.now(clock);
                if (entity == null) {
                  entity =
                      CentralAccountGroupEntity.create(
                          id,
                          code,
                          title,
                          request.parentAccountGroupId(),
                          request.importance(),
                          reasonableAssurance,
                          description,
                          sortOrder,
                          request.validFrom(),
                          request.validTo(),
                          actor,
                          now);
                  operation = RevisionOperationType.CREATE;
                  expected = null;
                  before = null;
                } else {
                  if (entity.getStatus() == MasterDataLifecycleStatus.ACTIVE)
                    throw support.duplicate(code);
                  if (!Objects.equals(
                      entity.getParentAccountGroupId(), request.parentAccountGroupId()))
                    throw invalidParent();
                  expected = entity.getVersion();
                  before = snapshot(entity);
                  if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) {
                    entity.restoreFromCreate(
                        title,
                        request.parentAccountGroupId(),
                        request.importance(),
                        reasonableAssurance,
                        description,
                        sortOrder,
                        request.validFrom(),
                        request.validTo(),
                        actor,
                        now);
                    operation = RevisionOperationType.RESTORE;
                  } else {
                    entity.reactivateFromCreate(
                        title,
                        request.parentAccountGroupId(),
                        request.importance(),
                        reasonableAssurance,
                        description,
                        sortOrder,
                        request.validFrom(),
                        request.validTo(),
                        actor,
                        now);
                    operation = RevisionOperationType.ACTIVATE;
                  }
                }
                var saved = repository.saveAndFlush(entity);
                canonical.set(mapper.detail(saved));
                var completed = withSelections(context, saved, completed(context, saved, operation, expected, before),
                    selectedControls, selectedObjectives, selectedRisks, canonicalControls, canonicalObjectives, canonicalRisks);
                finalized.set(
                    documents.finalizePreparedAggregate(
                        prepared,
                        DocumentLinkTargetType.CENTRAL_ACCOUNT_GROUP,
                        saved.getId(),
                        "MD_REFERENCE_MANAGE"));
                return completed;
              });
      return new CentralAccountGroupDtos.AggregateResponse(result.primaryResult().entityId(), result.primaryResult().revisionId(),
          result.primaryResult().version(), finalized.get(), canonical.get(), canonicalControls.get(),
          canonicalObjectives.get(), canonicalRisks.get());
    } catch (DataIntegrityViolationException e) {
      throw support.translateBusinessKeyViolation(e, "UK_CENTRAL_ACCOUNT_GROUP_CODE", code);
    }
  }

  public CentralAccountGroupDtos.AggregateResponse update(
      UUID id, CentralAccountGroupDtos.Update request) {
    long expected = support.requireVersion(request.version());
    String title = support.normalizeTitle(request.title()),
        description = support.normalizeDescription(request.description());
    boolean reasonableAssurance = Boolean.TRUE.equals(request.reasonableAssurance());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<CentralAccountGroupDtos.Detail> canonical = new AtomicReference<>();
    AtomicReference<List<DocumentCommandResponse>> finalized = new AtomicReference<>(List.of());
    AtomicReference<List<CentralControlAccountGroupResponse>> canonicalControls = new AtomicReference<>();
    AtomicReference<List<CentralControlObjectiveAccountGroupResponse>> canonicalObjectives = new AtomicReference<>();
    AtomicReference<List<AccountGroupRiskAssignmentDtos.Response>> canonicalRisks = new AtomicReference<>();
    RevisionExecutionResult result =
        revisions.executeStructural(
            guardsForSave(request.controlsToAdd(), request.controlLifecycleChanges(),
                request.riskTemplatesToAdd(), request.riskAssignmentLifecycleChanges()),
            RevisionRequest.central(
                "Update account group " + id, "Account Group definition update", null),
            context -> {
              requireGuard(context);
              var prepared = documents.prepareAggregate(request.documents());
              var selectedControls = controlCommands.lockAccountGroupChanges(
                  context, request.controlsToAdd(), request.controlLifecycleChanges());
              var selectedRisks = riskAssignments.lockEndpoints(
                  context, request.riskTemplatesToAdd(), request.riskAssignmentLifecycleChanges());
              var selectedObjectives = controlObjectiveCommands.lockAccountGroupChanges(
                  context, request.controlObjectivesToAdd(), request.controlObjectiveLifecycleChanges());
              var entity = lock(id);
              support.assertVersion(entity, expected);
              if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
              UUID parentId = request.parentChange() == null ? entity.getParentAccountGroupId() : request.parentChange().parentAccountGroupId();
              int sortOrder = request.sortOrder() == null ? entity.getSortOrder() : support.normalizeSortOrder(request.sortOrder());
              MasterDataLifecycleStatus status = request.status() == null ? entity.getStatus() : request.status();
              if (status == MasterDataLifecycleStatus.DELETED) throw new UnprocessableEntityException(
                  "INVALID_STATUS", "error.masterdata.v2.invalidLifecycleTransition", "Update accepts ACTIVE or INACTIVE only");
              var parents = hierarchy();
              hierarchySupport.requireParent(id, parentId, parents, "ACCOUNT_GROUP parent");
              hierarchySupport.rejectCycle(id, parentId, parents, CentralAccountGroupEntity::getParentAccountGroupId);

              if (Objects.equals(entity.getParentAccountGroupId(), parentId)
                  && entity.getSortOrder() == sortOrder
                  && entity.getStatus() == status
                  && Objects.equals(entity.getTitle(), title)
                  && Objects.equals(entity.getDescription(), description)
                  && entity.getImportance() == request.importance()
                  && entity.isReasonableAssurance() == reasonableAssurance
                  && Objects.equals(entity.getValidFrom(), request.validFrom())
                  && Objects.equals(entity.getValidTo(), request.validTo())
                  && empty(request.documents())
                  && selectedControls.isEmpty()
                  && selectedObjectives.isEmpty()
                  && selectedRisks.isEmpty()) throw noChange();
              JsonNode before = snapshot(entity);
              entity.update(
                  title,
                  description,
                  request.importance(),
                  reasonableAssurance,
                  request.validFrom(),
                  request.validTo(),
                  actors.currentActorId(),
                  Instant.now(clock));
              entity.move(parentId, sortOrder, actors.currentActorId(), Instant.now(clock));
              if (entity.getStatus() != status) {
                support.validateLifecycle(entity, status == MasterDataLifecycleStatus.ACTIVE ? RevisionOperationType.ACTIVATE : RevisionOperationType.INACTIVATE);
                if (status == MasterDataLifecycleStatus.ACTIVE) entity.activate(actors.currentActorId(), Instant.now(clock));
                else entity.inactivate(actors.currentActorId(), Instant.now(clock));
              }
              var saved = repository.saveAndFlush(entity);
              canonical.set(mapper.detail(saved));
              var completed = withSelections(context, saved,
                  completed(context, saved, RevisionOperationType.UPDATE, expected, before),
                  selectedControls, selectedObjectives, selectedRisks, canonicalControls, canonicalObjectives, canonicalRisks);
              finalized.set(
                  documents.finalizePreparedAggregate(
                      prepared,
                      DocumentLinkTargetType.CENTRAL_ACCOUNT_GROUP,
                      id,
                      "MD_REFERENCE_MANAGE"));
              return completed;
            });
    return new CentralAccountGroupDtos.AggregateResponse(result.primaryResult().entityId(), result.primaryResult().revisionId(),
        result.primaryResult().version(), finalized.get(), canonical.get(), canonicalControls.get(),
        canonicalObjectives.get(), canonicalRisks.get());
  }

  public MasterDataRevisionMutationResponse move(UUID id, CentralAccountGroupDtos.Move request) {
    long expected = support.requireVersion(request.version());
    int sortOrder = support.normalizeSortOrder(request.sortOrder());
    RevisionExecutionResult result =
        revisions.executeStructural(
            MasterDataHierarchyKey.ACCOUNT_GROUP,
            RevisionRequest.central(
                "Move account group " + id, "Account Group hierarchy move", null),
            context -> {
              requireGuard(context);
              var hierarchy = hierarchy();
              var entity = hierarchy.get(id);
              if (entity == null) throw notFound(id);
              support.assertVersion(entity, expected);
              entity.requireNotDeleted();
              hierarchySupport.requireParent(
                  id, request.parentAccountGroupId(), hierarchy, "Account Group parent");
              hierarchySupport.rejectCycle(
                  id,
                  request.parentAccountGroupId(),
                  hierarchy,
                  CentralAccountGroupEntity::getParentAccountGroupId);
              if (Objects.equals(entity.getParentAccountGroupId(), request.parentAccountGroupId())
                  && entity.getSortOrder() == sortOrder) throw invalidHierarchyMove();
              JsonNode before = snapshot(entity);
              entity.move(
                  request.parentAccountGroupId(),
                  sortOrder,
                  actors.currentActorId(),
                  Instant.now(clock));
              return completed(
                  context,
                  repository.saveAndFlush(entity),
                  RevisionOperationType.UPDATE,
                  expected,
                  before);
            });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  public MasterDataRevisionMutationResponse activate(UUID id, Long v) {
    return lifecycle(id, v, RevisionOperationType.ACTIVATE);
  }

  public MasterDataRevisionMutationResponse inactivate(UUID id, Long v) {
    return lifecycle(id, v, RevisionOperationType.INACTIVATE);
  }

  public MasterDataRevisionMutationResponse delete(UUID id, Long v) {
    return lifecycle(id, v, RevisionOperationType.DELETE);
  }

  public MasterDataRevisionMutationResponse restore(UUID id, Long v) {
    return lifecycle(id, v, RevisionOperationType.RESTORE);
  }

  private MasterDataRevisionMutationResponse lifecycle(
      UUID id, Long version, RevisionOperationType operation) {
    long expected = support.requireVersion(version);
    RevisionExecutionResult result =
        revisions.executeStructural(
            MasterDataHierarchyKey.ACCOUNT_GROUP,
            RevisionRequest.central(
                operation + " account group " + id, "Account Group lifecycle", null),
            context -> {
              requireGuard(context);
              var hierarchy = hierarchy();
              var entity = hierarchy.get(id);
              if (entity == null) throw notFound(id);
              support.assertVersion(entity, expected);
              support.validateLifecycle(entity, operation);
              if (operation == RevisionOperationType.DELETE
                  && repository.existsByParentAccountGroupIdAndStatusNot(
                      id, MasterDataLifecycleStatus.DELETED))
                throw new ConflictException(
                    "DEPENDENCY_EXISTS",
                    "error.masterdata.v2.dependencyExists",
                    "Account Group has nondeleted children",
                    id);
              if (operation == RevisionOperationType.DELETE
                  && dependencyChecker.centralAccountGroupHasApprovedDependencies(id))
                throw new ConflictException(
                    "DEPENDENCY_EXISTS",
                    "error.masterdata.v2.dependencyExists",
                    "Account Group has approved classification or assignment dependencies",
                    id);
              if (operation == RevisionOperationType.ACTIVATE
                  || operation == RevisionOperationType.RESTORE) {
                hierarchySupport.requireParent(
                    id, entity.getParentAccountGroupId(), hierarchy, "Account Group parent");
                hierarchySupport.rejectCycle(
                    id,
                    entity.getParentAccountGroupId(),
                    hierarchy,
                    CentralAccountGroupEntity::getParentAccountGroupId);
              }
              JsonNode before = snapshot(entity);
              UUID actor = actors.currentActorId();
              Instant now = Instant.now(clock);
              switch (operation) {
                case ACTIVATE -> entity.activate(actor, now);
                case INACTIVATE -> entity.inactivate(actor, now);
                case DELETE -> entity.delete(actor, now);
                case RESTORE -> entity.restore(actor, now);
                default -> throw new IllegalArgumentException("Unsupported lifecycle operation");
              }
              return completed(
                  context, repository.saveAndFlush(entity), operation, expected, before);
            });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  private List<MasterDataHierarchyKey> guardsForSave(List<AccountGroupControlSelection> selections,
      List<CentralAccountGroupDtos.ControlLifecycleChange> changes,
      List<AccountGroupRiskAssignmentDtos.Selection> riskSelections,
      List<AccountGroupRiskAssignmentDtos.LifecycleChange> riskChanges) {
    var keys = EnumSet.of(MasterDataHierarchyKey.ACCOUNT_GROUP);
    if (hasChanges(selections) || hasChanges(changes)) keys.add(MasterDataHierarchyKey.CONTROL);
    if (hasChanges(riskSelections) || hasChanges(riskChanges)) keys.add(MasterDataHierarchyKey.RISK);
    return List.copyOf(keys);
  }

  private static boolean hasChanges(List<?> changes) {
    return changes != null && !changes.isEmpty();
  }

  private RevisionOperationResult withSelections(RevisionExecutionContext context,
      CentralAccountGroupEntity group, RevisionOperationResult primary,
      List<AccountGroupControlChange> controls, List<AccountGroupControlObjectiveChange> objectives,
      List<LockedChange> risks,
      AtomicReference<List<CentralControlAccountGroupResponse>> canonicalControls,
      AtomicReference<List<CentralControlObjectiveAccountGroupResponse>> canonicalObjectives,
      AtomicReference<List<AccountGroupRiskAssignmentDtos.Response>> canonicalRisks) {
    if (controls.isEmpty() && objectives.isEmpty() && risks.isEmpty()) return primary;
    var contents = new ArrayList<>(primary.contentResults());
    if (!controls.isEmpty()) {
      contents.addAll(controlCommands.applyAccountGroupChanges(context, group, controls));
      canonicalControls.set(controlClassifications.forAccountGroup(group.getId()));
    }
    if (!objectives.isEmpty()) {
      contents.addAll(controlObjectiveCommands.applyAccountGroupChanges(context, group, objectives));
      canonicalObjectives.set(controlObjectiveClassifications.forAccountGroup(group.getId()));
    }
    if (!risks.isEmpty()) {
      contents.addAll(riskAssignments.apply(context, group, risks));
      canonicalRisks.set(riskAssignments.forAccountGroup(group.getId()));
    }
    return RevisionOperationResult.completed(context, primary.primaryResult(), contents);
  }

  private Map<UUID, CentralAccountGroupEntity> hierarchy() {
    return repository.findAllByOrderByIdAsc().stream()
        .collect(Collectors.toMap(CentralAccountGroupEntity::getId, Function.identity()));
  }

  private void requireGuard(RevisionExecutionContext c) {
    mutationGuard.requireHierarchyGuard(c, MasterDataHierarchyKey.ACCOUNT_GROUP);
  }

  private CentralAccountGroupEntity lock(UUID id) {
    return repository.lockById(id).orElseThrow(() -> notFound(id));
  }

  private NotFoundException notFound(UUID id) {
    return new NotFoundException(
        "MASTER_DATA_NOT_FOUND",
        "error.masterdata.v2.notFound",
        "Central Account Group not found",
        id);
  }

  private UnprocessableEntityException invalidParent() {
    return new UnprocessableEntityException(
        "INVALID_PARENT",
        "error.masterdata.v2.invalidParent",
        "Create cannot change the stored parent");
  }

  private UnprocessableEntityException noChange() {
    return new UnprocessableEntityException(
        "NO_CHANGE", "error.masterdata.v2.noChange", "The command contains no change");
  }

  private UnprocessableEntityException invalidHierarchyMove() {
    return new UnprocessableEntityException(
        "INVALID_HIERARCHY_MOVE",
        "error.masterdata.v2.invalidHierarchyMove",
        "The move does not change parent or sort order");
  }

  private Map<String, ?> typed(CentralAccountGroupEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("parentAccountGroupId", e.getParentAccountGroupId());
    m.put("importance", e.getImportance());
    m.put("reasonableAssurance", e.isReasonableAssurance());
    m.put("sortOrder", e.getSortOrder());
    return m;
  }

  private JsonNode snapshot(CentralAccountGroupEntity e) {
    return support.snapshot(e, typed(e));
  }

  private RevisionOperationResult completed(
      RevisionExecutionContext c,
      CentralAccountGroupEntity e,
      RevisionOperationType o,
      Long v,
      JsonNode b) {
    return support.completed(c, e, RevisionEntityType.CENTRAL_ACCOUNT_GROUP, o, v, b, typed(e));
  }

  private boolean empty(DocumentAggregateBatchRequest r) {
    return r == null
        || (r.newDocuments().isEmpty()
            && r.newVersions().isEmpty()
            && r.metadataUpdates().isEmpty());
  }
}
