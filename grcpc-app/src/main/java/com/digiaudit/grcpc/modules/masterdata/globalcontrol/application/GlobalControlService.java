package com.digiaudit.grcpc.modules.masterdata.globalcontrol.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.api.GlobalControlDtos;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.api.GlobalControlRegulationDtos;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.api.GlobalControlMapper;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain.ControlGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain.GlobalControlEntity;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain.GlobalControlRegulationRepository;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain.GlobalControlRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionActorProvider;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionCoordinator;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionMutationGuard;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionRequest;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataAggregateMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GlobalControlService {
  private final GlobalControlRepository controls;
  private final ControlGroupRepository groups;
  private final GlobalControlRegulationRepository relations;
  private final GlobalControlRegulationService regulationRelations;
  private final GlobalControlMapper mapper;
  private final MasterDataRevisionCoordinator revisions;
  private final MasterDataRevisionActorProvider actors;
  private final RevisionMutationGuard guard;
  private final CatalogCommandSupport support;
  private final DocumentCommandService documents;
  private final Clock clock;

  public GlobalControlService(GlobalControlRepository controls, ControlGroupRepository groups,
      GlobalControlRegulationRepository relations, GlobalControlRegulationService regulationRelations,
      GlobalControlMapper mapper,
      MasterDataRevisionCoordinator revisions, MasterDataRevisionActorProvider actors,
      RevisionMutationGuard guard, CatalogCommandSupport support, DocumentCommandService documents,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.controls = controls;
    this.groups = groups;
    this.relations = relations;
    this.regulationRelations = regulationRelations;
    this.mapper = mapper;
    this.revisions = revisions;
    this.actors = actors;
    this.guard = guard;
    this.support = support;
    this.documents = documents;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<GlobalControlDtos.Detail> list() {
    return controls.findAllByOrderByTitleAscIdAsc().stream()
        .filter(e -> e.getStatus() != MasterDataLifecycleStatus.DELETED)
        .map(mapper::control).toList();
  }

  @Transactional(readOnly = true)
  public GlobalControlDtos.Detail get(UUID id) {
    GlobalControlEntity entity = controls.findById(id).orElseThrow(() -> notFound(id));
    if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
    return mapper.control(entity);
  }

  @Transactional
  public GlobalControlDtos.AggregateResponse create(GlobalControlDtos.Create request) {
    String code = support.normalizeCode(request.code());
    String name = support.normalizeTitle(request.name());
    String type = normalizeType(request.controlType());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<List<DocumentCommandResponse>> finalized = new AtomicReference<>(List.of());
    var result = revisions.executeStructural(
        List.of(MasterDataHierarchyKey.GLOBAL_CONTROL, MasterDataHierarchyKey.REGULATION),
        RevisionRequest.central("Create global control " + code, "Global Control create", null),
        context -> {
          guard.requireHierarchyGuard(context, MasterDataHierarchyKey.GLOBAL_CONTROL);
          guard.requireHierarchyGuard(context, MasterDataHierarchyKey.REGULATION);
          var prepared = documents.prepareAggregate(request.documents());
          requireGroup(request.controlGroupId());
          if (controls.findByCode(code).isPresent()) throw support.duplicate(code);
          GlobalControlEntity entity = new GlobalControlEntity(UUID.randomUUID(), code, name,
              support.normalizeDescription(request.description()), request.controlGroupId(), type,
              Boolean.TRUE.equals(request.testRequired()), request.validFrom(), request.validTo(),
              actors.currentActorId(), Instant.now(clock));
          var relationPlan = regulationRelations.prepare(entity,
              regulationChanges(entity.getId(), request.regulationIds(), request.regulationChanges()));
          entity = controls.saveAndFlush(entity);
          var relationContents = regulationRelations.apply(relationPlan);
          finalized.set(documents.finalizePreparedAggregate(prepared,
              DocumentLinkTargetType.GLOBAL_CONTROL, entity.getId(), "MD_CONTROL_MANAGE"));
          var ownerResult = support.completed(context, entity, RevisionEntityType.GLOBAL_CONTROL,
              RevisionOperationType.CREATE, null, null, typed(entity));
          return combined(context, ownerResult, relationContents);
        });
    return aggregateResponse(result, finalized.get());
  }

  @Transactional
  public GlobalControlDtos.AggregateResponse update(UUID id, GlobalControlDtos.Update request) {
    long expected = support.requireVersion(request.version());
    String name = support.normalizeTitle(request.name());
    String type = normalizeType(request.controlType());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<List<DocumentCommandResponse>> finalized = new AtomicReference<>(List.of());
    var result = revisions.executeStructural(
        List.of(MasterDataHierarchyKey.GLOBAL_CONTROL, MasterDataHierarchyKey.REGULATION),
        RevisionRequest.central("Update global control " + id, "Global Control update", null),
        context -> {
          guard.requireHierarchyGuard(context, MasterDataHierarchyKey.GLOBAL_CONTROL);
          guard.requireHierarchyGuard(context, MasterDataHierarchyKey.REGULATION);
          var prepared = documents.prepareAggregate(request.documents());
          requireGroup(request.controlGroupId());
          GlobalControlEntity entity = controls.lockById(id).orElseThrow(() -> notFound(id));
          if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
          support.assertVersion(entity, expected);
          var relationPlan = regulationRelations.prepare(entity,
              regulationChanges(id, request.regulationIds(), request.regulationChanges()));
          if (relationPlan.isEmpty() && !hasDocuments(request.documents())
              && java.util.Objects.equals(entity.getName(), name)
              && java.util.Objects.equals(entity.getDescription(), support.normalizeDescription(request.description()))
              && java.util.Objects.equals(entity.getControlGroupId(), request.controlGroupId())
              && java.util.Objects.equals(entity.getControlType(), type)
              && entity.getTestRequired() == Boolean.TRUE.equals(request.testRequired())
              && java.util.Objects.equals(entity.getValidFrom(), request.validFrom())
              && java.util.Objects.equals(entity.getValidTo(), request.validTo()))
            throw new UnprocessableEntityException("NO_CHANGE", "error.masterdata.v2.noChange", "The command contains no change");
          JsonNode before = support.snapshot(entity, typed(entity));
          entity.update(name, support.normalizeDescription(request.description()),
              request.controlGroupId(), type, Boolean.TRUE.equals(request.testRequired()),
              request.validFrom(), request.validTo(), actors.currentActorId(), Instant.now(clock));
          entity = controls.saveAndFlush(entity);
          var relationContents = regulationRelations.apply(relationPlan);
          finalized.set(documents.finalizePreparedAggregate(prepared,
              DocumentLinkTargetType.GLOBAL_CONTROL, entity.getId(), "MD_CONTROL_MANAGE"));
          var ownerResult = support.completed(context, entity, RevisionEntityType.GLOBAL_CONTROL,
              RevisionOperationType.UPDATE, expected, before, typed(entity));
          return combined(context, ownerResult, relationContents);
        });
    return aggregateResponse(result, finalized.get());
  }

  public MasterDataRevisionMutationResponse delete(UUID id, Long version) {
    long expected = support.requireVersion(version);
    var result = revisions.executeStructural(MasterDataHierarchyKey.GLOBAL_CONTROL,
        RevisionRequest.central("Delete global control " + id, "Global Control delete", null),
        context -> {
          guard.requireHierarchyGuard(context, MasterDataHierarchyKey.GLOBAL_CONTROL);
          GlobalControlEntity entity = requireControl(id);
          support.assertVersion(entity, expected);
          if (relations.existsByGlobalControlIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED))
            throw new ConflictException("DEPENDENCY_EXISTS", "error.masterdata.v2.dependencyExists",
                "Global Control has regulation relations", id);
          JsonNode before = support.snapshot(entity, typed(entity));
          entity.delete(actors.currentActorId(), Instant.now(clock));
          entity = controls.saveAndFlush(entity);
          return support.completed(context, entity, RevisionEntityType.GLOBAL_CONTROL,
              RevisionOperationType.DELETE, expected, before, typed(entity));
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  public MasterDataRevisionMutationResponse restore(UUID id, Long version) {
    long expected = support.requireVersion(version);
    var result = revisions.executeStructural(MasterDataHierarchyKey.GLOBAL_CONTROL,
        RevisionRequest.central("Restore global control " + id, "Global Control restore", null),
        context -> {
          guard.requireHierarchyGuard(context, MasterDataHierarchyKey.GLOBAL_CONTROL);
          GlobalControlEntity entity = controls.findById(id).orElseThrow(() -> notFound(id));
          support.assertVersion(entity, expected);
          support.validateLifecycle(entity, RevisionOperationType.RESTORE);
          requireGroup(entity.getControlGroupId());
          JsonNode before = support.snapshot(entity, typed(entity));
          entity.restore(actors.currentActorId(), Instant.now(clock));
          entity = controls.saveAndFlush(entity);
          return support.completed(context, entity, RevisionEntityType.GLOBAL_CONTROL,
              RevisionOperationType.RESTORE, expected, before, typed(entity));
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  private void requireGroup(UUID id) {
    var group = groups.findById(id).orElseThrow(() -> invalidGroup(id));
    if (group.getStatus() != MasterDataLifecycleStatus.ACTIVE) throw invalidGroup(id);
  }

  private List<GlobalControlRegulationDtos.Change> regulationChanges(UUID controlId, List<UUID> requestedIds,
      List<GlobalControlRegulationDtos.Change> changes) {
    if (requestedIds != null && changes != null) throw new UnprocessableEntityException("INVALID_REGULATION_SELECTION",
        "error.masterdata.globalControl.regulationSelection", "Use exactly one regulation change format");
    if (requestedIds == null) return changes;
    Set<UUID> desired = new LinkedHashSet<>(requestedIds);
    if (desired.contains(null) || desired.size() != requestedIds.size())
      throw new UnprocessableEntityException("INVALID_REGULATION_SELECTION",
          "error.masterdata.globalControl.regulationSelection", "Regulation selection is invalid");
    var existing = relations.findByGlobalControlIdAndStatusNot(
        controlId, MasterDataLifecycleStatus.DELETED);
    Set<UUID> current = new LinkedHashSet<>();
    existing.forEach(link -> current.add(link.getRegulationId()));
    var result = new java.util.ArrayList<GlobalControlRegulationDtos.Change>();
    for (var link : existing) {
      if (!desired.contains(link.getRegulationId()))
        result.add(new GlobalControlRegulationDtos.Change(link.getRegulationId(),
            GlobalControlRegulationDtos.Operation.DELETE, link.getId(), link.getVersion()));
    }
    for (UUID regulationId : desired) {
      if (!current.contains(regulationId)) {
        var deleted = relations.findByGlobalControlIdAndRegulationId(controlId, regulationId).orElse(null);
        result.add(new GlobalControlRegulationDtos.Change(regulationId,
            GlobalControlRegulationDtos.Operation.CREATE_OR_RESTORE,
            deleted == null ? null : deleted.getId(), deleted == null ? null : deleted.getVersion()));
      }
    }
    return result;
  }

  private com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionOperationResult combined(
      com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext context,
      com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionOperationResult owner,
      List<com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult> relations) {
    var contents = new java.util.ArrayList<>(owner.contentResults());
    contents.addAll(relations);
    return com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionOperationResult.completed(
        context, owner.primaryResult(), contents);
  }

  private GlobalControlDtos.AggregateResponse aggregateResponse(
      com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionResult result,
      List<DocumentCommandResponse> finalized) {
    var primary = result.primaryResult();
    return new GlobalControlDtos.AggregateResponse(primary.entityId(), primary.revisionId(), primary.version(),
        finalized, mapper.control(requireControl(primary.entityId())), regulationRelations.list(primary.entityId()));
  }

  private GlobalControlEntity requireControl(UUID id) {
    GlobalControlEntity entity = controls.findById(id).orElseThrow(() -> notFound(id));
    if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
    return entity;
  }

  private boolean hasDocuments(com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest batch) {
    return batch != null && (!batch.newDocuments().isEmpty() || !batch.newVersions().isEmpty() || !batch.metadataUpdates().isEmpty());
  }

  private String normalizeType(String value) {
    if (value == null || value.isBlank())
      throw new UnprocessableEntityException("CONTROL_TYPE_REQUIRED",
          "error.masterdata.globalControl.typeRequired", "Control type is required");
    String normalized = value.trim().toUpperCase(Locale.ROOT);
    if (normalized.length() > 64)
      throw new UnprocessableEntityException("CONTROL_TYPE_TOO_LONG",
          "error.masterdata.globalControl.typeLength", "Control type exceeds 64 characters");
    return normalized;
  }

  private Map<String, ?> typed(GlobalControlEntity entity) {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("controlGroupId", entity.getControlGroupId());
    fields.put("controlType", entity.getControlType());
    fields.put("testRequired", entity.getTestRequired());
    return fields;
  }

  private NotFoundException notFound(UUID id) {
    return new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound",
        "Global Control not found", id);
  }

  private UnprocessableEntityException invalidGroup(UUID id) {
    return new UnprocessableEntityException("CONTROL_GROUP_NOT_ACTIVE",
        "error.masterdata.globalControl.groupNotActive", "Control Group is not active", id);
  }
}
