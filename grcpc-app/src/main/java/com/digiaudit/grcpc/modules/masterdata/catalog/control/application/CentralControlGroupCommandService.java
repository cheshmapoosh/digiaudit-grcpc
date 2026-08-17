package com.digiaudit.grcpc.modules.masterdata.catalog.control.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CentralControlGroupDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogHierarchySupport;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionActorProvider;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionCoordinator;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionMutationGuard;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionOperationResult;
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
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class CentralControlGroupCommandService {
  private final CentralControlGroupRepository repository;
  private final CentralControlRepository controls;
  private final MasterDataRevisionCoordinator revisions;
  private final MasterDataRevisionActorProvider actors;
  private final RevisionMutationGuard guard;
  private final CatalogCommandSupport support;
  private final CatalogHierarchySupport hierarchySupport;
  private final Clock clock;

  public CentralControlGroupCommandService(
      CentralControlGroupRepository repository,
      CentralControlRepository controls,
      MasterDataRevisionCoordinator revisions,
      MasterDataRevisionActorProvider actors,
      RevisionMutationGuard guard,
      CatalogCommandSupport support,
      CatalogHierarchySupport hierarchySupport,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.repository = repository;
    this.controls = controls;
    this.revisions = revisions;
    this.actors = actors;
    this.guard = guard;
    this.support = support;
    this.hierarchySupport = hierarchySupport;
    this.clock = clock;
  }

  public MasterDataRevisionMutationResponse create(CentralControlGroupDtos.Create request) {
    String code = support.normalizeCode(request.code());
    String title = support.normalizeTitle(request.title());
    String description = support.normalizeDescription(request.description());
    int sortOrder = support.normalizeSortOrder(request.sortOrder());
    support.validateValidity(request.validFrom(), request.validTo());
    try {
      var result =
          revisions.executeStructural(
              MasterDataHierarchyKey.CONTROL,
              RevisionRequest.central(
                  "Create control group " + code, "Control Group structural create", null),
              context -> {
                requireGuard(context);
                Map<UUID, CentralControlGroupEntity> tree = tree();
                CentralControlGroupEntity entity = repository.findByCode(code).orElse(null);
                UUID id = entity == null ? UUID.randomUUID() : entity.getId();
                hierarchySupport.requireParent(id, request.parentGroupId(), tree, "Control Group parent");
                hierarchySupport.rejectCycle(
                    id, request.parentGroupId(), tree, CentralControlGroupEntity::getParentGroupId);
                UUID actor = actors.currentActorId();
                Instant now = Instant.now(clock);
                RevisionOperationType operation;
                Long expectedVersion;
                JsonNode before;
                if (entity == null) {
                  entity =
                      CentralControlGroupEntity.create(
                          id,
                          code,
                          title,
                          request.parentGroupId(),
                          description,
                          sortOrder,
                          request.validFrom(),
                          request.validTo(),
                          actor,
                          now);
                  operation = RevisionOperationType.CREATE;
                  expectedVersion = null;
                  before = null;
                } else {
                  if (entity.getStatus() == MasterDataLifecycleStatus.ACTIVE) throw support.duplicate(code);
                  if (!Objects.equals(entity.getParentGroupId(), request.parentGroupId())) throw invalidParent();
                  expectedVersion = entity.getVersion();
                  before = snapshot(entity);
                  if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) {
                    entity.restoreFromCreate(
                        title,
                        request.parentGroupId(),
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
                        request.parentGroupId(),
                        description,
                        sortOrder,
                        request.validFrom(),
                        request.validTo(),
                        actor,
                        now);
                    operation = RevisionOperationType.ACTIVATE;
                  }
                }
                return completed(
                    context,
                    repository.saveAndFlush(entity),
                    operation,
                    expectedVersion,
                    before);
              });
      return MasterDataRevisionMutationResponse.from(result.primaryResult());
    } catch (DataIntegrityViolationException exception) {
      throw support.translateBusinessKeyViolation(exception, "UK_CENTRAL_CONTROL_GROUP_CODE", code);
    }
  }

  public MasterDataRevisionMutationResponse update(UUID id, CentralControlGroupDtos.Update request) {
    long expectedVersion = support.requireVersion(request.version());
    String title = support.normalizeTitle(request.title());
    String description = support.normalizeDescription(request.description());
    int sortOrder = support.normalizeSortOrder(request.sortOrder());
    MasterDataLifecycleStatus requestedStatus = requireEditableStatus(request.status());
    support.validateValidity(request.validFrom(), request.validTo());
    var result =
        revisions.executeStructural(
            MasterDataHierarchyKey.CONTROL,
            RevisionRequest.central("Update control group " + id, "Control Group update", null),
            context -> {
              requireGuard(context);
              Map<UUID, CentralControlGroupEntity> tree = tree();
              CentralControlGroupEntity entity = tree.get(id);
              if (entity == null || entity.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
              support.assertVersion(entity, expectedVersion);
              hierarchySupport.requireParent(id, request.parentGroupId(), tree, "Control Group parent");
              hierarchySupport.rejectCycle(
                  id, request.parentGroupId(), tree, CentralControlGroupEntity::getParentGroupId);
              if (same(entity, title, description, sortOrder, requestedStatus, request)) throw noChange();
              JsonNode before = snapshot(entity);
              UUID actor = actors.currentActorId();
              Instant now = Instant.now(clock);
              entity.update(title, description, request.validFrom(), request.validTo(), actor, now);
              if (!Objects.equals(entity.getParentGroupId(), request.parentGroupId())
                  || entity.getSortOrder() != sortOrder) {
                entity.move(request.parentGroupId(), sortOrder, actor, now);
              }
              if (entity.getStatus() != requestedStatus) {
                if (requestedStatus == MasterDataLifecycleStatus.ACTIVE) entity.activate(actor, now);
                else entity.inactivate(actor, now);
              }
              return completed(
                  context,
                  repository.saveAndFlush(entity),
                  RevisionOperationType.UPDATE,
                  expectedVersion,
                  before);
            });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
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
      UUID id, Long version, RevisionOperationType operation) {
    long expectedVersion = support.requireVersion(version);
    var result =
        revisions.executeStructural(
            MasterDataHierarchyKey.CONTROL,
            RevisionRequest.central(operation + " control group " + id, "Control Group lifecycle", null),
            context -> {
              requireGuard(context);
              Map<UUID, CentralControlGroupEntity> tree = tree();
              CentralControlGroupEntity entity = tree.get(id);
              if (entity == null) throw notFound(id);
              support.assertVersion(entity, expectedVersion);
              support.validateLifecycle(entity, operation);
              if (operation == RevisionOperationType.DELETE
                  && (repository.existsByParentGroupIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED)
                      || controls.existsByControlGroupIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED))) {
                throw new ConflictException(
                    "DEPENDENCY_EXISTS",
                    "error.masterdata.v2.dependencyExists",
                    "Control Group has nondeleted children",
                    id);
              }
              if (operation == RevisionOperationType.ACTIVATE || operation == RevisionOperationType.RESTORE) {
                hierarchySupport.requireParent(id, entity.getParentGroupId(), tree, "Control Group parent");
                hierarchySupport.rejectCycle(
                    id, entity.getParentGroupId(), tree, CentralControlGroupEntity::getParentGroupId);
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
                  context, repository.saveAndFlush(entity), operation, expectedVersion, before);
            });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  private boolean same(
      CentralControlGroupEntity entity,
      String title,
      String description,
      int sortOrder,
      MasterDataLifecycleStatus status,
      CentralControlGroupDtos.Update request) {
    return Objects.equals(entity.getTitle(), title)
        && Objects.equals(entity.getDescription(), description)
        && Objects.equals(entity.getParentGroupId(), request.parentGroupId())
        && entity.getSortOrder() == sortOrder
        && entity.getStatus() == status
        && Objects.equals(entity.getValidFrom(), request.validFrom())
        && Objects.equals(entity.getValidTo(), request.validTo());
  }

  private Map<UUID, CentralControlGroupEntity> tree() {
    return repository.findAllByOrderByIdAsc().stream()
        .collect(Collectors.toMap(CentralControlGroupEntity::getId, Function.identity()));
  }

  private void requireGuard(RevisionExecutionContext context) {
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.CONTROL);
  }

  private Map<String, Object> typed(CentralControlGroupEntity entity) {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("parentGroupId", entity.getParentGroupId());
    fields.put("sortOrder", entity.getSortOrder());
    return fields;
  }

  private JsonNode snapshot(CentralControlGroupEntity entity) {
    return support.snapshot(entity, typed(entity));
  }

  private RevisionOperationResult completed(
      RevisionExecutionContext context,
      CentralControlGroupEntity entity,
      RevisionOperationType operation,
      Long expectedVersion,
      JsonNode before) {
    return support.completed(
        context,
        entity,
        RevisionEntityType.CENTRAL_CONTROL_GROUP,
        operation,
        expectedVersion,
        before,
        typed(entity));
  }

  private MasterDataLifecycleStatus requireEditableStatus(MasterDataLifecycleStatus status) {
    if (status == null || status == MasterDataLifecycleStatus.DELETED) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_TRANSITION",
          "error.masterdata.v2.invalidLifecycleTransition",
          "Control Group edit status must be ACTIVE or INACTIVE");
    }
    return status;
  }

  private NotFoundException notFound(UUID id) {
    return new NotFoundException(
        "MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound", "Control Group not found", id);
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
}
