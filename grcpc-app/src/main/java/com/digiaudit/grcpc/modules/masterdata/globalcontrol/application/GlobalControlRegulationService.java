package com.digiaudit.grcpc.modules.masterdata.globalcontrol.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.api.GlobalControlRegulationDtos;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain.GlobalControlEntity;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain.GlobalControlRegulationEntity;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain.GlobalControlRegulationRepository;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain.GlobalControlRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionActorProvider;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionCoordinator;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionMutationGuard;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionOperationResult;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionRequest;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GlobalControlRegulationService {
  private final GlobalControlRegulationRepository links;
  private final GlobalControlRepository controls;
  private final CentralRegulationRepository regulations;
  private final CentralRegulationGroupRepository regulationGroups;
  private final MasterDataRevisionCoordinator revisions;
  private final MasterDataRevisionActorProvider actors;
  private final RevisionMutationGuard guard;
  private final CatalogCommandSupport support;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public GlobalControlRegulationService(GlobalControlRegulationRepository links,
      GlobalControlRepository controls, CentralRegulationRepository regulations,
      CentralRegulationGroupRepository regulationGroups,
      MasterDataRevisionCoordinator revisions, MasterDataRevisionActorProvider actors,
      RevisionMutationGuard guard, CatalogCommandSupport support, ObjectMapper objectMapper,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.links = links;
    this.controls = controls;
    this.regulations = regulations;
    this.regulationGroups = regulationGroups;
    this.revisions = revisions;
    this.actors = actors;
    this.guard = guard;
    this.support = support;
    this.objectMapper = objectMapper;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<GlobalControlRegulationDtos.Link> list(UUID controlId) {
    requireControl(controlId);
    return links.findByGlobalControlIdAndStatusNot(controlId, MasterDataLifecycleStatus.DELETED)
        .stream().map(this::detail).toList();
  }

  @Transactional(readOnly = true)
  public List<GlobalControlRegulationDtos.RegulationOption> options() {
    return regulations.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(
        MasterDataLifecycleStatus.DELETED).stream()
        .filter(e -> e.getStatus() == MasterDataLifecycleStatus.ACTIVE)
        .map(e -> new GlobalControlRegulationDtos.RegulationOption(
            e.getId(), e.getCode(), e.getTitle())).toList();
  }

  @Transactional(readOnly = true)
  public GlobalControlRegulationDtos.SelectionOptions selectionOptions() {
    var groups = regulationGroups.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(
        MasterDataLifecycleStatus.DELETED).stream()
        .filter(group -> group.getStatus() == MasterDataLifecycleStatus.ACTIVE)
        .map(group -> new GlobalControlRegulationDtos.SelectionGroup(group.getId(),
            group.getParentGroupId(), group.getCode(), group.getTitle())).toList();
    var selectedGroupIds = groups.stream().map(GlobalControlRegulationDtos.SelectionGroup::id)
        .collect(java.util.stream.Collectors.toSet());
    var laws = regulations.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(
        MasterDataLifecycleStatus.DELETED).stream()
        .filter(regulation -> regulation.getStatus() == MasterDataLifecycleStatus.ACTIVE
            && selectedGroupIds.contains(regulation.getRegulationGroupId()))
        .map(regulation -> new GlobalControlRegulationDtos.RegulationOptionWithGroup(
            regulation.getId(), regulation.getRegulationGroupId(),
            regulation.getCode(), regulation.getTitle())).toList();
    return new GlobalControlRegulationDtos.SelectionOptions(groups, laws);
  }

  public MasterDataRevisionMutationResponse attach(UUID controlId, UUID regulationId) {
    var result = revisions.executeStructural(
        List.of(MasterDataHierarchyKey.GLOBAL_CONTROL, MasterDataHierarchyKey.REGULATION),
        RevisionRequest.central("Attach regulation " + regulationId + " to global control " + controlId,
            "Global Control regulation relation", null),
        context -> {
          requireGuards(context);
          requireActiveControl(controlId);
          requireActiveRegulation(regulationId);
          GlobalControlRegulationEntity entity = links.findByGlobalControlIdAndRegulationId(
              controlId, regulationId).orElse(null);
          RevisionOperationType operation;
          Long expected;
          JsonNode before;
          UUID actor = actors.currentActorId();
          Instant now = Instant.now(clock);
          if (entity == null) {
            entity = new GlobalControlRegulationEntity(UUID.randomUUID(), controlId,
                regulationId, actor, now);
            operation = RevisionOperationType.CREATE;
            expected = null;
            before = null;
          } else if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) {
            expected = entity.getVersion();
            before = snapshot(entity);
            entity.restore(actor, now);
            operation = RevisionOperationType.RESTORE;
          } else {
            throw new ConflictException("DUPLICATE_BUSINESS_KEY",
                "error.masterdata.v2.duplicateBusinessKey",
                "Regulation is already related to this Global Control", regulationId);
          }
          entity = links.saveAndFlush(entity);
          return completed(context, entity, operation, expected, before);
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  public MasterDataRevisionMutationResponse remove(UUID controlId, UUID regulationId, Long version) {
    long expected = support.requireVersion(version);
    var result = revisions.executeStructural(
        List.of(MasterDataHierarchyKey.GLOBAL_CONTROL, MasterDataHierarchyKey.REGULATION),
        RevisionRequest.central("Remove regulation " + regulationId + " from global control " + controlId,
            "Global Control regulation relation", null),
        context -> {
          requireGuards(context);
          requireControl(controlId);
          GlobalControlRegulationEntity entity = links.findByGlobalControlIdAndRegulationId(
              controlId, regulationId).orElseThrow(() -> linkNotFound(regulationId));
          if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) throw linkNotFound(regulationId);
          if (entity.getVersion() != expected)
            throw new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict",
                "Regulation relation has changed", entity.getId());
          JsonNode before = snapshot(entity);
          entity.delete(actors.currentActorId(), Instant.now(clock));
          entity = links.saveAndFlush(entity);
          return completed(context, entity, RevisionOperationType.DELETE, expected, before);
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  private RevisionOperationResult completed(RevisionExecutionContext context,
      GlobalControlRegulationEntity entity, RevisionOperationType operation, Long expected,
      JsonNode before) {
    MasterDataMutationResult primary = new MasterDataMutationResult(
        entity.getId(), context.revisionId(), entity.getVersion());
    RevisionContentResult content = RevisionContentResult.completed(
        RevisionEntityType.GLOBAL_CONTROL_REGULATION, entity.getId(), operation, expected,
        before, snapshot(entity), entity.getVersion(),
        objectMapper.valueToTree(Map.of("validated", true)));
    return RevisionOperationResult.completed(context, primary, List.of(content));
  }

  private JsonNode snapshot(GlobalControlRegulationEntity entity) {
    return objectMapper.valueToTree(Map.of(
        "id", entity.getId(),
        "globalControlId", entity.getGlobalControlId(),
        "regulationId", entity.getRegulationId(),
        "status", entity.getStatus().wireValue(),
        "version", entity.getVersion()));
  }

  private GlobalControlRegulationDtos.Link detail(GlobalControlRegulationEntity entity) {
    CentralRegulationEntity regulation = regulations.findById(entity.getRegulationId())
        .orElseThrow(() -> linkNotFound(entity.getRegulationId()));
    return new GlobalControlRegulationDtos.Link(entity.getId(), entity.getGlobalControlId(),
        entity.getRegulationId(), regulation.getCode(), regulation.getTitle(), entity.getVersion());
  }

  private void requireGuards(RevisionExecutionContext context) {
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.GLOBAL_CONTROL);
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.REGULATION);
  }

  private GlobalControlEntity requireControl(UUID id) {
    GlobalControlEntity entity = controls.findById(id).orElseThrow(() -> controlNotFound(id));
    if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) throw controlNotFound(id);
    return entity;
  }

  private void requireActiveControl(UUID id) {
    if (requireControl(id).getStatus() != MasterDataLifecycleStatus.ACTIVE)
      throw controlNotFound(id);
  }

  private void requireActiveRegulation(UUID id) {
    CentralRegulationEntity entity = regulations.findById(id)
        .orElseThrow(() -> regulationNotFound(id));
    if (entity.getStatus() != MasterDataLifecycleStatus.ACTIVE) throw regulationNotFound(id);
  }

  private NotFoundException controlNotFound(UUID id) {
    return new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound",
        "Global Control not found", id);
  }

  private NotFoundException regulationNotFound(UUID id) {
    return new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound",
        "Regulation not found", id);
  }

  private NotFoundException linkNotFound(UUID id) {
    return new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound",
        "Global Control regulation relation not found", id);
  }
}
