package com.digiaudit.grcpc.modules.masterdata.globalcontrol.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogHierarchySupport;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.api.ControlGroupDtos;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.api.GlobalControlMapper;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain.ControlGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain.ControlGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain.GlobalControlRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionActorProvider;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionCoordinator;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionMutationGuard;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionRequest;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ControlGroupService {
  private final ControlGroupRepository groups;
  private final GlobalControlRepository controls;
  private final GlobalControlMapper mapper;
  private final MasterDataRevisionCoordinator revisions;
  private final MasterDataRevisionActorProvider actors;
  private final RevisionMutationGuard guard;
  private final CatalogCommandSupport support;
  private final CatalogHierarchySupport hierarchySupport;
  private final Clock clock;

  public ControlGroupService(ControlGroupRepository groups, GlobalControlRepository controls,
      GlobalControlMapper mapper, MasterDataRevisionCoordinator revisions,
      MasterDataRevisionActorProvider actors, RevisionMutationGuard guard,
      CatalogCommandSupport support, CatalogHierarchySupport hierarchySupport,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.groups = groups;
    this.controls = controls;
    this.mapper = mapper;
    this.revisions = revisions;
    this.actors = actors;
    this.guard = guard;
    this.support = support;
    this.hierarchySupport = hierarchySupport;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<ControlGroupDtos.Detail> list() {
    return groups.findAllByOrderByTitleAscIdAsc().stream()
        .filter(e -> e.getStatus() != MasterDataLifecycleStatus.DELETED)
        .map(mapper::group).toList();
  }

  @Transactional(readOnly = true)
  public ControlGroupDtos.Detail get(UUID id) {
    ControlGroupEntity entity = groups.findById(id).orElseThrow(() -> notFound(id));
    if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
    return mapper.group(entity);
  }

  public MasterDataRevisionMutationResponse create(ControlGroupDtos.Create request) {
    String code = support.normalizeCode(request.code());
    String name = support.normalizeTitle(request.name());
    support.validateValidity(request.validFrom(), request.validTo());
    var result = revisions.executeStructural(MasterDataHierarchyKey.GLOBAL_CONTROL,
        RevisionRequest.central("Create global control group " + code, "Group create", null),
        context -> {
          guard.requireHierarchyGuard(context, MasterDataHierarchyKey.GLOBAL_CONTROL);
          Map<UUID, ControlGroupEntity> tree = tree();
          if (groups.findByCode(code).isPresent()) throw support.duplicate(code);
          UUID id = UUID.randomUUID();
          hierarchySupport.requireParent(id, request.parentId(), tree, "Control Group parent");
          ControlGroupEntity entity = new ControlGroupEntity(id, code, name,
              support.normalizeDescription(request.description()), request.parentId(),
              request.validFrom(), request.validTo(), actors.currentActorId(), Instant.now(clock));
          entity = groups.saveAndFlush(entity);
          return support.completed(context, entity, RevisionEntityType.CONTROL_GROUP,
              RevisionOperationType.CREATE, null, null, typed(entity));
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  public MasterDataRevisionMutationResponse update(UUID id, ControlGroupDtos.Update request) {
    long expected = support.requireVersion(request.version());
    String name = support.normalizeTitle(request.name());
    support.validateValidity(request.validFrom(), request.validTo());
    var result = revisions.executeStructural(MasterDataHierarchyKey.GLOBAL_CONTROL,
        RevisionRequest.central("Update global control group " + id, "Group update", null),
        context -> {
          guard.requireHierarchyGuard(context, MasterDataHierarchyKey.GLOBAL_CONTROL);
          Map<UUID, ControlGroupEntity> tree = tree();
          ControlGroupEntity entity = tree.get(id);
          if (entity == null || entity.getStatus() == MasterDataLifecycleStatus.DELETED)
            throw notFound(id);
          support.assertVersion(entity, expected);
          hierarchySupport.requireParent(id, request.parentId(), tree, "Control Group parent");
          hierarchySupport.rejectCycle(id, request.parentId(), tree, ControlGroupEntity::getParentId);
          JsonNode before = support.snapshot(entity, typed(entity));
          entity.update(name, support.normalizeDescription(request.description()), request.parentId(),
              request.validFrom(), request.validTo(), actors.currentActorId(), Instant.now(clock));
          entity = groups.saveAndFlush(entity);
          return support.completed(context, entity, RevisionEntityType.CONTROL_GROUP,
              RevisionOperationType.UPDATE, expected, before, typed(entity));
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  public MasterDataRevisionMutationResponse delete(UUID id, Long version) {
    long expected = support.requireVersion(version);
    var result = revisions.executeStructural(MasterDataHierarchyKey.GLOBAL_CONTROL,
        RevisionRequest.central("Delete global control group " + id, "Group delete", null),
        context -> {
          guard.requireHierarchyGuard(context, MasterDataHierarchyKey.GLOBAL_CONTROL);
          ControlGroupEntity entity = tree().get(id);
          if (entity == null || entity.getStatus() == MasterDataLifecycleStatus.DELETED)
            throw notFound(id);
          support.assertVersion(entity, expected);
          if (groups.existsByParentIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED)
              || controls.existsByControlGroupIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED))
            throw new ConflictException("DEPENDENCY_EXISTS", "error.masterdata.v2.dependencyExists",
                "Control group has child groups or global controls", id);
          JsonNode before = support.snapshot(entity, typed(entity));
          entity.delete(actors.currentActorId(), Instant.now(clock));
          entity = groups.saveAndFlush(entity);
          return support.completed(context, entity, RevisionEntityType.CONTROL_GROUP,
              RevisionOperationType.DELETE, expected, before, typed(entity));
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  public MasterDataRevisionMutationResponse restore(UUID id, Long version) {
    long expected = support.requireVersion(version);
    var result = revisions.executeStructural(MasterDataHierarchyKey.GLOBAL_CONTROL,
        RevisionRequest.central("Restore global control group " + id, "Group restore", null),
        context -> {
          guard.requireHierarchyGuard(context, MasterDataHierarchyKey.GLOBAL_CONTROL);
          Map<UUID, ControlGroupEntity> tree = tree();
          ControlGroupEntity entity = tree.get(id);
          if (entity == null) throw notFound(id);
          support.assertVersion(entity, expected);
          support.validateLifecycle(entity, RevisionOperationType.RESTORE);
          hierarchySupport.requireParent(id, entity.getParentId(), tree, "Control Group parent");
          hierarchySupport.rejectCycle(id, entity.getParentId(), tree, ControlGroupEntity::getParentId);
          JsonNode before = support.snapshot(entity, typed(entity));
          entity.restore(actors.currentActorId(), Instant.now(clock));
          entity = groups.saveAndFlush(entity);
          return support.completed(context, entity, RevisionEntityType.CONTROL_GROUP,
              RevisionOperationType.RESTORE, expected, before, typed(entity));
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  private Map<UUID, ControlGroupEntity> tree() {
    return groups.findAllByOrderByTitleAscIdAsc().stream()
        .collect(Collectors.toMap(ControlGroupEntity::getId, Function.identity()));
  }

  private Map<String, ?> typed(ControlGroupEntity entity) {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("parentId", entity.getParentId());
    return fields;
  }

  private NotFoundException notFound(UUID id) {
    return new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound",
        "Control group not found", id);
  }
}
