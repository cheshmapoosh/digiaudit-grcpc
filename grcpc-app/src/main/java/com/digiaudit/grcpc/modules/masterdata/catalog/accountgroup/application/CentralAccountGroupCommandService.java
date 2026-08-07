package com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.api.dto.CentralAccountGroupDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.entity.CentralAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.repository.CentralAccountGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogHierarchySupport;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataAggregateMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataStructuralDependencyChecker;
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

  public CentralAccountGroupCommandService(
      CentralAccountGroupRepository repository,
      MasterDataRevisionCoordinator revisions,
      MasterDataRevisionActorProvider actors,
      RevisionMutationGuard mutationGuard,
      DocumentCommandService documents,
      CatalogCommandSupport support,
      CatalogHierarchySupport hierarchySupport,
      MasterDataStructuralDependencyChecker dependencyChecker,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.repository = repository;
    this.revisions = revisions;
    this.actors = actors;
    this.mutationGuard = mutationGuard;
    this.documents = documents;
    this.support = support;
    this.hierarchySupport = hierarchySupport;
    this.dependencyChecker = dependencyChecker;
    this.clock = clock;
  }

  public MasterDataAggregateMutationResponse create(CentralAccountGroupDtos.Create request) {
    String code = support.normalizeCode(request.code()),
        title = support.normalizeTitle(request.title()),
        description = support.normalizeDescription(request.description());
    int sortOrder = support.normalizeSortOrder(request.sortOrder());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<List<DocumentCommandResponse>> finalized = new AtomicReference<>(List.of());
    try {
      RevisionExecutionResult result =
          revisions.executeStructural(
              MasterDataHierarchyKey.ACCOUNT_GROUP,
              RevisionRequest.central(
                  "Create account group " + code, "Account Group structural create", null),
              context -> {
                requireGuard(context);
                var prepared = documents.prepareAggregate(request.documents());
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
                finalized.set(
                    documents.finalizePreparedAggregate(
                        prepared,
                        DocumentLinkTargetType.CENTRAL_ACCOUNT_GROUP,
                        saved.getId(),
                        "CENTRAL_ACCOUNT_GROUP_CREATE"));
                return completed(context, saved, operation, expected, before);
              });
      return support.aggregateResponse(result, finalized.get());
    } catch (DataIntegrityViolationException e) {
      throw support.translateBusinessKeyViolation(e, "UK_CENTRAL_ACCOUNT_GROUP_CODE", code);
    }
  }

  public MasterDataAggregateMutationResponse update(
      UUID id, CentralAccountGroupDtos.Update request) {
    long expected = support.requireVersion(request.version());
    String title = support.normalizeTitle(request.title()),
        description = support.normalizeDescription(request.description());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<List<DocumentCommandResponse>> finalized = new AtomicReference<>(List.of());
    RevisionExecutionResult result =
        revisions.execute(
            RevisionRequest.central(
                "Update account group " + id, "Account Group definition update", null),
            context -> {
              var prepared = documents.prepareAggregate(request.documents());
              var entity = lock(id);
              support.assertVersion(entity, expected);
              if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
              if (Objects.equals(entity.getTitle(), title)
                  && Objects.equals(entity.getDescription(), description)
                  && Objects.equals(entity.getValidFrom(), request.validFrom())
                  && Objects.equals(entity.getValidTo(), request.validTo())
                  && empty(request.documents())) throw noChange();
              JsonNode before = snapshot(entity);
              entity.update(
                  title,
                  description,
                  request.validFrom(),
                  request.validTo(),
                  actors.currentActorId(),
                  Instant.now(clock));
              var saved = repository.saveAndFlush(entity);
              finalized.set(
                  documents.finalizePreparedAggregate(
                      prepared,
                      DocumentLinkTargetType.CENTRAL_ACCOUNT_GROUP,
                      id,
                      "CENTRAL_ACCOUNT_GROUP_UPDATE"));
              return completed(context, saved, RevisionOperationType.UPDATE, expected, before);
            });
    return support.aggregateResponse(result, finalized.get());
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
                    "Account Group has approved classification dependencies",
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
