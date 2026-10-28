package com.digiaudit.grcpc.modules.masterdata.objective.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogHierarchySupport;
import com.digiaudit.grcpc.modules.masterdata.objective.api.ObjectiveDtos;
import com.digiaudit.grcpc.modules.masterdata.objective.api.ObjectiveMapper;
import com.digiaudit.grcpc.modules.masterdata.objective.api.OrganizationObjectiveDtos;
import com.digiaudit.grcpc.modules.masterdata.objective.api.OrganizationObjectiveChange;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.ObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.ObjectiveKind;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.ObjectiveRepository;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.OrganizationObjectiveRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataAggregateMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Clock;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ObjectiveService {
  private final ObjectiveRepository objectives;
  private final ObjectiveMapper mapper;
  private final OrganizationObjectiveRepository assignments;
  private final OrganizationObjectiveService organizationObjectives;
  private final MasterDataRevisionCoordinator revisions;
  private final MasterDataRevisionActorProvider actors;
  private final RevisionMutationGuard mutationGuard;
  private final CatalogCommandSupport support;
  private final CatalogHierarchySupport hierarchySupport;
  private final DocumentCommandService documents;
  private final Clock clock;

  public ObjectiveService(ObjectiveRepository objectives, ObjectiveMapper mapper,
      OrganizationObjectiveRepository assignments, OrganizationObjectiveService organizationObjectives,
      MasterDataRevisionCoordinator revisions, MasterDataRevisionActorProvider actors,
      RevisionMutationGuard mutationGuard, CatalogCommandSupport support,
      CatalogHierarchySupport hierarchySupport, DocumentCommandService documents,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.objectives = objectives;
    this.mapper = mapper;
    this.assignments = assignments;
    this.organizationObjectives = organizationObjectives;
    this.revisions = revisions;
    this.actors = actors;
    this.mutationGuard = mutationGuard;
    this.support = support;
    this.hierarchySupport = hierarchySupport;
    this.documents = documents;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<ObjectiveDtos.Detail> list() {
    return objectives.findAllByOrderByTitleAscIdAsc().stream()
        .filter(e -> e.getStatus() != MasterDataLifecycleStatus.DELETED)
        .map(mapper::detail).toList();
  }

  @Transactional(readOnly = true)
  public ObjectiveDtos.Detail get(UUID id) {
    ObjectiveEntity e = objectives.findById(id).orElseThrow(() -> notFound(id));
    if (e.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
    return mapper.detail(e);
  }

  @Transactional(readOnly = true)
  public ObjectiveEntity requireActive(UUID id) {
    ObjectiveEntity e = objectives.findById(id).orElseThrow(() -> notFound(id));
    if (e.getStatus() != MasterDataLifecycleStatus.ACTIVE) throw notFound(id);
    return e;
  }

  @Transactional
  public ObjectiveDtos.AggregateResponse create(ObjectiveDtos.Create request) {
    ObjectiveKind kind = request.kind() == null ? ObjectiveKind.OBJECTIVE : request.kind();
    String code = support.normalizeCode(request.code());
    String name = support.normalizeTitle(request.name());
    if (kind == ObjectiveKind.OBJECTIVE) support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<List<DocumentCommandResponse>> finalized = new AtomicReference<>(List.of());
    AtomicReference<OrganizationObjectiveService.Plan> relationPlan = new AtomicReference<>();
    RevisionExecutionResult result = revisions.executeStructural(
        List.of(MasterDataHierarchyKey.OBJECTIVE, MasterDataHierarchyKey.ORGANIZATION),
        RevisionRequest.central("Create objective " + code, "Objective create", null),
        context -> {
          mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.OBJECTIVE);
          mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.ORGANIZATION);
          var prepared = documents.prepareAggregate(request.documents());
          Map<UUID, ObjectiveEntity> hierarchy = hierarchy();
          if (objectives.findByCode(code).isPresent()) throw support.duplicate(code);
          UUID id = UUID.randomUUID();
          validateStructure(id, kind, request.parentObjectiveId(), hierarchy);
          validateStrategyOrganizations(id, kind, request.organizationIds());
          if (kind == ObjectiveKind.STRATEGY && request.organizationChanges() != null && !request.organizationChanges().isEmpty())
            throw invalidOrganizationChanges();
          ObjectiveEntity entity = new ObjectiveEntity(id, code, name,
              support.normalizeDescription(request.description()),
              kind == ObjectiveKind.STRATEGY ? null : normalizeType(request.objectiveType()),
              request.parentObjectiveId(), kind == ObjectiveKind.STRATEGY ? null : request.validFrom(),
              kind == ObjectiveKind.STRATEGY ? null : request.validTo(),
              actors.currentActorId(), Instant.now(clock), kind);
          var relations = organizationObjectives.prepareForObjective(entity,
              organizationChanges(id, request.organizationIds(), request.organizationChanges(), name));
          relationPlan.set(relations);
          entity = objectives.saveAndFlush(entity);
          finalized.set(documents.finalizePreparedAggregate(prepared, DocumentLinkTargetType.OBJECTIVE,
              id, "MD_REFERENCE_MANAGE"));
          return support.completed(context, entity, RevisionEntityType.OBJECTIVE,
              RevisionOperationType.CREATE, null, null, typed(entity));
        });
    // The immediate caused-by FK requires the CENTRAL header to exist before LOCAL is flushed.
    // Both coordinators still join this protected outer transaction and retain all endpoint locks.
    applyOrganizationChanges(relationPlan.get(), result.primaryResult().revisionId());
    return aggregateResponse(result, finalized.get());
  }

  @Transactional
  public ObjectiveDtos.AggregateResponse update(UUID id, ObjectiveDtos.Update request) {
    long expected = support.requireVersion(request.version());
    String name = support.normalizeTitle(request.name());
    AtomicReference<List<DocumentCommandResponse>> finalized = new AtomicReference<>(List.of());
    AtomicReference<OrganizationObjectiveService.Plan> relationPlan = new AtomicReference<>();
    RevisionExecutionResult result = revisions.executeStructural(
        List.of(MasterDataHierarchyKey.OBJECTIVE, MasterDataHierarchyKey.ORGANIZATION),
        RevisionRequest.central("Update objective " + id, "Objective update", null),
        context -> {
          mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.OBJECTIVE);
          mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.ORGANIZATION);
          var prepared = documents.prepareAggregate(request.documents());
          Map<UUID, ObjectiveEntity> hierarchy = hierarchy();
          ObjectiveEntity entity = hierarchy.get(id);
          if (entity == null || entity.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
          support.assertVersion(entity, expected);
          ObjectiveKind kind = request.kind() == null ? entity.getKind() : request.kind();
          if (kind == ObjectiveKind.OBJECTIVE) support.validateValidity(request.validFrom(), request.validTo());
          validateStructure(id, kind, request.parentObjectiveId(), hierarchy);
          validateStrategyOrganizations(id, kind, request.organizationIds());
          if (kind == ObjectiveKind.STRATEGY && request.organizationChanges() != null && !request.organizationChanges().isEmpty())
            throw invalidOrganizationChanges();
          var projectedOwner = new ObjectiveEntity(id, entity.getCode(), name,
              support.normalizeDescription(request.description()),
              kind == ObjectiveKind.STRATEGY ? null : normalizeType(request.objectiveType()),
              request.parentObjectiveId(), kind == ObjectiveKind.STRATEGY ? null : request.validFrom(),
              kind == ObjectiveKind.STRATEGY ? null : request.validTo(), actors.currentActorId(), Instant.now(clock), kind);
          if (entity.getStatus() == MasterDataLifecycleStatus.INACTIVE)
            projectedOwner.inactivate(actors.currentActorId(), Instant.now(clock));
          var relations = organizationObjectives.prepareForObjective(projectedOwner,
              organizationChanges(id, request.organizationIds(), request.organizationChanges(), name));
          relationPlan.set(relations);
          if (relations.isEmpty() && !hasDocuments(request.documents())
              && Objects.equals(entity.getName(), projectedOwner.getName())
              && Objects.equals(entity.getDescription(), projectedOwner.getDescription())
              && Objects.equals(entity.getObjectiveType(), projectedOwner.getObjectiveType())
              && Objects.equals(entity.getParentObjectiveId(), projectedOwner.getParentObjectiveId())
              && entity.getKind() == projectedOwner.getKind()
              && Objects.equals(entity.getValidFrom(), projectedOwner.getValidFrom())
              && Objects.equals(entity.getValidTo(), projectedOwner.getValidTo()))
            throw new UnprocessableEntityException("NO_CHANGE", "error.masterdata.v2.noChange", "The command contains no change");
          JsonNode before = support.snapshot(entity, typed(entity));
          entity.update(name, support.normalizeDescription(request.description()),
              kind == ObjectiveKind.STRATEGY ? null : normalizeType(request.objectiveType()), request.parentObjectiveId(),
              kind == ObjectiveKind.STRATEGY ? null : request.validFrom(),
              kind == ObjectiveKind.STRATEGY ? null : request.validTo(), actors.currentActorId(), Instant.now(clock), kind);
          entity = objectives.saveAndFlush(entity);
          finalized.set(documents.finalizePreparedAggregate(prepared, DocumentLinkTargetType.OBJECTIVE,
              id, "MD_REFERENCE_MANAGE"));
          return support.completed(context, entity, RevisionEntityType.OBJECTIVE,
              RevisionOperationType.UPDATE, expected, before, typed(entity));
        });
    applyOrganizationChanges(relationPlan.get(), result.primaryResult().revisionId());
    return aggregateResponse(result, finalized.get());
  }

  public MasterDataRevisionMutationResponse delete(UUID id, Long version) {
    long expected = support.requireVersion(version);
    RevisionExecutionResult result = revisions.executeStructural(
        MasterDataHierarchyKey.OBJECTIVE,
        RevisionRequest.central("Delete objective " + id, "Objective delete", null),
        context -> {
          mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.OBJECTIVE);
          ObjectiveEntity entity = hierarchy().get(id);
          if (entity == null || entity.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
          support.assertVersion(entity, expected);
          if (objectives.existsByParentObjectiveIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED)
              || assignments.existsByObjectiveIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED)) {
            throw new ConflictException("DEPENDENCY_EXISTS", "error.masterdata.v2.dependencyExists",
                "Objective has child objectives or organization assignments", id);
          }
          JsonNode before = support.snapshot(entity, typed(entity));
          entity.delete(actors.currentActorId(), Instant.now(clock));
          entity = objectives.saveAndFlush(entity);
          return support.completed(context, entity, RevisionEntityType.OBJECTIVE,
              RevisionOperationType.DELETE, expected, before, typed(entity));
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  public MasterDataRevisionMutationResponse restore(UUID id, Long version) {
    return restore(id, version, null);
  }

  public MasterDataRevisionMutationResponse restore(UUID id, Long version, UUID requestedParentId) {
    long expected = support.requireVersion(version);
    RevisionExecutionResult result = revisions.executeStructural(
        MasterDataHierarchyKey.OBJECTIVE,
        RevisionRequest.central("Restore objective " + id, "Objective restore", null),
        context -> {
          mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.OBJECTIVE);
          Map<UUID, ObjectiveEntity> hierarchy = hierarchy();
          ObjectiveEntity entity = hierarchy.get(id);
          if (entity == null) throw notFound(id);
          support.assertVersion(entity, expected);
          support.validateLifecycle(entity, RevisionOperationType.RESTORE);
          UUID parentId = requestedParentId != null ? requestedParentId
              : entity.getKind() == ObjectiveKind.STRATEGY ? null : entity.getParentObjectiveId();
          validateStructure(id, entity.getKind(), parentId, hierarchy);
          validateStrategyOrganizations(id, entity.getKind(), null);
          JsonNode before = support.snapshot(entity, typed(entity));
          entity.restore(actors.currentActorId(), Instant.now(clock), parentId);
          entity = objectives.saveAndFlush(entity);
          return support.completed(context, entity, RevisionEntityType.OBJECTIVE,
              RevisionOperationType.RESTORE, expected, before, typed(entity));
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  private Map<UUID, ObjectiveEntity> hierarchy() {
    return objectives.findAllByOrderByTitleAscIdAsc().stream()
        .collect(Collectors.toMap(ObjectiveEntity::getId, Function.identity()));
  }

  private void validateStructure(UUID id, ObjectiveKind kind, UUID parentId,
      Map<UUID, ObjectiveEntity> hierarchy) {
    if (kind == ObjectiveKind.STRATEGY && parentId != null) {
      throw new UnprocessableEntityException("STRATEGY_PARENT_NOT_ALLOWED",
          "error.masterdata.objective.strategyParent", "A strategy cannot have a parent strategy");
    }
    ObjectiveEntity parent = hierarchySupport.requireParent(id, parentId, hierarchy, "Strategy");
    if (kind == ObjectiveKind.OBJECTIVE && parent == null) {
      throw new UnprocessableEntityException("OBJECTIVE_STRATEGY_REQUIRED",
          "error.masterdata.objective.strategyRequired", "An objective requires one strategy");
    }
    if (parent != null && (parent.getKind() != ObjectiveKind.STRATEGY
        || parent.getParentObjectiveId() != null)) {
      throw new UnprocessableEntityException("INVALID_OBJECTIVE_STRATEGY",
          "error.masterdata.objective.invalidStrategy", "The parent must be a strategy");
    }
    hierarchySupport.rejectCycle(id, parentId, hierarchy, ObjectiveEntity::getParentObjectiveId);
    if (kind == ObjectiveKind.STRATEGY && hierarchy.values().stream().anyMatch(child ->
        id.equals(child.getParentObjectiveId()) && child.getKind() == ObjectiveKind.STRATEGY
            && child.getStatus() != MasterDataLifecycleStatus.DELETED)) {
      throw new ConflictException("STRATEGY_HAS_STRATEGIES",
          "error.masterdata.objective.strategyChildren", "Promote child strategies to roots first", id);
    }
    if (kind == ObjectiveKind.OBJECTIVE && hierarchy.values().stream().anyMatch(child ->
        id.equals(child.getParentObjectiveId()) && child.getStatus() != MasterDataLifecycleStatus.DELETED)) {
      throw new ConflictException("OBJECTIVE_HAS_CHILDREN",
          "error.masterdata.objective.hasChildren", "An objective cannot have child nodes", id);
    }
  }

  private void validateStrategyOrganizations(UUID id, ObjectiveKind kind, List<UUID> requestedIds) {
    if (kind == ObjectiveKind.STRATEGY && (requestedIds == null
        ? assignments.existsByObjectiveIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED)
        : !requestedIds.isEmpty())) {
      throw new UnprocessableEntityException("STRATEGY_ORGANIZATION_ASSIGNMENT",
          "error.masterdata.objective.strategyAssignment", "Only objectives can be assigned to organizations");
    }
  }

  private List<OrganizationObjectiveChange> organizationChanges(UUID objectiveId, List<UUID> requestedIds,
      List<OrganizationObjectiveChange> changes, String objectiveName) {
    if (requestedIds != null && changes != null) throw invalidOrganizationChanges();
    if (requestedIds == null) return changes;
    Set<UUID> desired = new LinkedHashSet<>(requestedIds);
    if (desired.contains(null) || desired.size() != requestedIds.size())
      throw new UnprocessableEntityException("INVALID_ORGANIZATION_SELECTION",
          "error.masterdata.objective.organizationSelection", "Organization selection is invalid");
    var existing = assignments.findByObjectiveIdAndStatusNotOrderByNameAsc(
        objectiveId, MasterDataLifecycleStatus.DELETED);
    Set<UUID> current = existing.stream().map(e -> e.getOrganizationId())
        .collect(Collectors.toSet());
    var result = new ArrayList<OrganizationObjectiveChange>();
    for (var assignment : existing) {
      if (!desired.contains(assignment.getOrganizationId()))
        result.add(new OrganizationObjectiveChange(OrganizationObjectiveChange.Operation.DELETE,
            assignment.getId(), assignment.getVersion(), null, assignment.getOrganizationId(),
            null, null, null, null, null, null));
    }
    for (UUID organizationId : desired) {
      if (!current.contains(organizationId)) {
        var deleted = assignments.findByOrganizationIdAndObjectiveId(organizationId, objectiveId).orElse(null);
        result.add(new OrganizationObjectiveChange(OrganizationObjectiveChange.Operation.CREATE_OR_RESTORE,
            deleted == null ? null : deleted.getId(), deleted == null ? null : deleted.getVersion(),
            null, organizationId, deleted == null ? objectiveName : null, null, null, null, null, null));
      }
    }
    return result;
  }

  private void applyOrganizationChanges(OrganizationObjectiveService.Plan plan, UUID centralRevisionId) {
    for (UUID organizationId : plan.organizationIds()) {
      revisions.execute(RevisionRequest.local(organizationId, "Objective organization changes",
          "Objective organization aggregate", centralRevisionId), local -> {
        var contents = organizationObjectives.apply(plan.forOrganization(organizationId));
        var first = contents.getFirst();
        return RevisionOperationResult.completed(local,
            new com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult(
                first.entityId(), local.revisionId(), first.appliedEntityVersion()), contents);
      });
    }
  }

  private ObjectiveDtos.AggregateResponse aggregateResponse(RevisionExecutionResult result,
      List<DocumentCommandResponse> finalized) {
    var primary = result.primaryResult();
    var entity = objectives.findById(primary.entityId()).orElseThrow(() -> notFound(primary.entityId()));
    return new ObjectiveDtos.AggregateResponse(primary.entityId(), primary.revisionId(), primary.version(),
        finalized, mapper.detail(entity), entity.getKind() == ObjectiveKind.STRATEGY ? List.of()
            : organizationObjectives.canonicalForObjective(entity.getId()));
  }

  private UnprocessableEntityException invalidOrganizationChanges() {
    return new UnprocessableEntityException("INVALID_ORGANIZATION_SELECTION",
        "error.masterdata.objective.organizationSelection", "Organization changes are invalid");
  }

  private boolean hasDocuments(com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest batch) {
    return batch != null && (!batch.newDocuments().isEmpty() || !batch.newVersions().isEmpty() || !batch.metadataUpdates().isEmpty());
  }

  private Map<String, ?> typed(ObjectiveEntity e) {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("kind", e.getKind());
    fields.put("objectiveType", e.getObjectiveType());
    fields.put("parentObjectiveId", e.getParentObjectiveId());
    return fields;
  }

  private String normalizeType(String value) {
    if (value == null || value.isBlank()) return null;
    String result = value.trim().toUpperCase(Locale.ROOT);
    if (result.length() > 64)
      throw new UnprocessableEntityException("INVALID_OBJECTIVE_TYPE",
          "error.masterdata.objective.typeLength", "Objective type exceeds 64 characters");
    return result;
  }

  private NotFoundException notFound(UUID id) {
    return new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound",
        "Objective not found", id);
  }
}
