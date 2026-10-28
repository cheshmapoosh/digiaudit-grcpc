package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.application;

import com.digiaudit.grcpc.common.exception.*;
import com.digiaudit.grcpc.modules.document.api.dto.*;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.CentralRegulationDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.*;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.mapper.CentralRegulationMapper;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class CentralRegulationGroupCommandService {
  private final CentralRegulationGroupRepository repository;
  private final CentralRegulationRepository regulations;
  private final MasterDataRevisionCoordinator revisions;
  private final MasterDataRevisionActorProvider actors;
  private final RevisionMutationGuard guard;
  private final DocumentCommandService documents;
  private final CatalogCommandSupport support;
  private final CatalogHierarchySupport hierarchySupport;
  private final Clock clock;
  private final CentralRegulationMapper mapper;

  public CentralRegulationGroupCommandService(
      CentralRegulationGroupRepository r,
      CentralRegulationRepository regulations,
      MasterDataRevisionCoordinator revisions,
      MasterDataRevisionActorProvider actors,
      RevisionMutationGuard guard,
      DocumentCommandService documents,
      CatalogCommandSupport support,
      CatalogHierarchySupport hierarchySupport,
      @Qualifier("masterDataRevisionClock") Clock clock, CentralRegulationMapper mapper) {
    repository = r;
    this.regulations = regulations;
    this.revisions = revisions;
    this.actors = actors;
    this.guard = guard;
    this.documents = documents;
    this.support = support;
    this.hierarchySupport = hierarchySupport;
    this.clock = clock;
    this.mapper = mapper;
  }

  public CentralRegulationDtos.GroupAggregateResponse create(CentralRegulationDtos.CreateGroup r) {
    String code = support.normalizeCode(r.code()),
        title = support.normalizeTitle(r.title()),
        description = support.normalizeDescription(r.description());
    int sort = support.normalizeSortOrder(r.sortOrder());
    support.validateValidity(r.validFrom(), r.validTo());
    AtomicReference<CentralRegulationDtos.GroupDetail> canonical = new AtomicReference<>();
    AtomicReference<List<DocumentCommandResponse>> docs = new AtomicReference<>(List.of());
    try {
      var result =
          revisions.executeStructural(
              MasterDataHierarchyKey.REGULATION,
              RevisionRequest.central(
                  "Create regulation group " + code, "Regulation Group structural create", null),
              c -> {
                requireGuard(c);
                var prepared = documents.prepareAggregate(r.documents());
                var tree = tree();
                var e = repository.findByCode(code).orElse(null);
                UUID id = e == null ? UUID.randomUUID() : e.getId();
                hierarchySupport.requireParent(
                    id, r.parentGroupId(), tree, "Regulation Group parent");
                hierarchySupport.rejectCycle(
                    id, r.parentGroupId(), tree, CentralRegulationGroupEntity::getParentGroupId);
                RevisionOperationType op;
                Long expected;
                JsonNode before;
                UUID actor = actors.currentActorId();
                Instant now = Instant.now(clock);
                if (e == null) {
                  e =
                      CentralRegulationGroupEntity.create(
                          id,
                          code,
                          title,
                          r.parentGroupId(),
                          description,
                          sort,
                          r.validFrom(),
                          r.validTo(),
                          actor,
                          now);
                  op = RevisionOperationType.CREATE;
                  expected = null;
                  before = null;
                } else {
                  if (e.getStatus() == MasterDataLifecycleStatus.ACTIVE)
                    throw support.duplicate(code);
                  if (!Objects.equals(e.getParentGroupId(), r.parentGroupId()))
                    throw invalidParent();
                  expected = e.getVersion();
                  before = snapshot(e);
                  if (e.getStatus() == MasterDataLifecycleStatus.DELETED) {
                    e.restoreFromCreate(
                        title,
                        r.parentGroupId(),
                        description,
                        sort,
                        r.validFrom(),
                        r.validTo(),
                        actor,
                        now);
                    op = RevisionOperationType.RESTORE;
                  } else {
                    e.reactivateFromCreate(
                        title,
                        r.parentGroupId(),
                        description,
                        sort,
                        r.validFrom(),
                        r.validTo(),
                        actor,
                        now);
                    op = RevisionOperationType.ACTIVATE;
                  }
                }
                var saved = repository.saveAndFlush(e);
              canonical.set(mapper.detail(saved));
                docs.set(
                    documents.finalizePreparedAggregate(
                        prepared,
                        DocumentLinkTargetType.CENTRAL_REGULATION_GROUP,
                        saved.getId(),
                        "MD_GOVERNANCE_MANAGE"));
                return completed(c, saved, op, expected, before);
              });
      return new CentralRegulationDtos.GroupAggregateResponse(result.primaryResult().entityId(), result.primaryResult().revisionId(),
          result.primaryResult().version(), docs.get(), canonical.get());
    } catch (DataIntegrityViolationException e) {
      throw support.translateBusinessKeyViolation(e, "UK_CENTRAL_REG_GROUP_CODE", code);
    }
  }

  public CentralRegulationDtos.GroupAggregateResponse update(UUID id, CentralRegulationDtos.UpdateGroup r) {
    long expected = support.requireVersion(r.version());
    String title = support.normalizeTitle(r.title()),
        description = support.normalizeDescription(r.description());
    support.validateValidity(r.validFrom(), r.validTo());
    AtomicReference<CentralRegulationDtos.GroupDetail> canonical = new AtomicReference<>();
    AtomicReference<List<DocumentCommandResponse>> docs = new AtomicReference<>(List.of());
    var result =
        revisions.executeStructural(
            MasterDataHierarchyKey.REGULATION,
            RevisionRequest.central(
                "Update regulation group " + id, "Regulation Group definition update", null),
            c -> {
              requireGuard(c);
              var prepared = documents.prepareAggregate(r.documents());
              var e = lock(id);
              support.assertVersion(e, expected);
              if (e.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
              UUID parentId = r.parentChange() == null ? e.getParentGroupId() : r.parentChange().parentGroupId();
              int sortOrder = r.sortOrder() == null ? e.getSortOrder() : support.normalizeSortOrder(r.sortOrder());
              MasterDataLifecycleStatus status = r.status() == null ? e.getStatus() : r.status();
              if (status == MasterDataLifecycleStatus.DELETED) throw new UnprocessableEntityException(
                  "INVALID_STATUS", "error.masterdata.v2.invalidLifecycleTransition", "Update accepts ACTIVE or INACTIVE only");
              var parents = tree();
              hierarchySupport.requireParent(id, parentId, parents, "REGULATION parent");
              hierarchySupport.rejectCycle(id, parentId, parents, CentralRegulationGroupEntity::getParentGroupId);

              if (Objects.equals(e.getParentGroupId(), parentId)
                  && e.getSortOrder() == sortOrder
                  && e.getStatus() == status
                  && Objects.equals(e.getTitle(), title)
                  && Objects.equals(e.getDescription(), description)
                  && Objects.equals(e.getValidFrom(), r.validFrom())
                  && Objects.equals(e.getValidTo(), r.validTo())
                  && empty(r.documents())) throw noChange();
              JsonNode before = snapshot(e);
              e.update(
                  title,
                  description,
                  r.validFrom(),
                  r.validTo(),
                  actors.currentActorId(),
                  Instant.now(clock));
              e.move(parentId, sortOrder, actors.currentActorId(), Instant.now(clock));
              if (e.getStatus() != status) {
                support.validateLifecycle(e, status == MasterDataLifecycleStatus.ACTIVE ? RevisionOperationType.ACTIVATE : RevisionOperationType.INACTIVATE);
                if (status == MasterDataLifecycleStatus.ACTIVE) e.activate(actors.currentActorId(), Instant.now(clock));
                else e.inactivate(actors.currentActorId(), Instant.now(clock));
              }
              var saved = repository.saveAndFlush(e);
              canonical.set(mapper.detail(saved));
              docs.set(
                  documents.finalizePreparedAggregate(
                      prepared,
                      DocumentLinkTargetType.CENTRAL_REGULATION_GROUP,
                      id,
                      "MD_GOVERNANCE_MANAGE"));
              return completed(c, saved, RevisionOperationType.UPDATE, expected, before);
            });
    return new CentralRegulationDtos.GroupAggregateResponse(result.primaryResult().entityId(), result.primaryResult().revisionId(),
          result.primaryResult().version(), docs.get(), canonical.get());
  }

  public MasterDataRevisionMutationResponse move(UUID id, CentralRegulationDtos.MoveGroup r) {
    long expected = support.requireVersion(r.version());
    int sort = support.normalizeSortOrder(r.sortOrder());
    var result =
        revisions.executeStructural(
            MasterDataHierarchyKey.REGULATION,
            RevisionRequest.central(
                "Move regulation group " + id, "Regulation Group hierarchy move", null),
            c -> {
              requireGuard(c);
              var tree = tree();
              var e = tree.get(id);
              if (e == null) throw notFound(id);
              support.assertVersion(e, expected);
              e.requireNotDeleted();
              hierarchySupport.requireParent(
                  id, r.parentGroupId(), tree, "Regulation Group parent");
              hierarchySupport.rejectCycle(
                  id, r.parentGroupId(), tree, CentralRegulationGroupEntity::getParentGroupId);
              if (Objects.equals(e.getParentGroupId(), r.parentGroupId())
                  && e.getSortOrder() == sort) throw invalidHierarchyMove();
              JsonNode before = snapshot(e);
              e.move(r.parentGroupId(), sort, actors.currentActorId(), Instant.now(clock));
              return completed(
                  c, repository.saveAndFlush(e), RevisionOperationType.UPDATE, expected, before);
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
      UUID id, Long version, RevisionOperationType op) {
    long expected = support.requireVersion(version);
    var result =
        revisions.executeStructural(
            MasterDataHierarchyKey.REGULATION,
            RevisionRequest.central(
                op + " regulation group " + id, "Regulation Group lifecycle", null),
            c -> {
              requireGuard(c);
              var tree = tree();
              var e = tree.get(id);
              if (e == null) throw notFound(id);
              support.assertVersion(e, expected);
              support.validateLifecycle(e, op);
              if (op == RevisionOperationType.DELETE
                  && (repository.existsByParentGroupIdAndStatusNot(
                          id, MasterDataLifecycleStatus.DELETED)
                      || regulations.existsByRegulationGroupIdAndStatusNot(
                          id, MasterDataLifecycleStatus.DELETED)))
                throw new ConflictException(
                    "DEPENDENCY_EXISTS",
                    "error.masterdata.v2.dependencyExists",
                    "Regulation Group has nondeleted children",
                    id);
              if (op == RevisionOperationType.ACTIVATE || op == RevisionOperationType.RESTORE) {
                hierarchySupport.requireParent(
                    id, e.getParentGroupId(), tree, "Regulation Group parent");
                hierarchySupport.rejectCycle(
                    id, e.getParentGroupId(), tree, CentralRegulationGroupEntity::getParentGroupId);
              }
              JsonNode before = snapshot(e);
              UUID actor = actors.currentActorId();
              Instant now = Instant.now(clock);
              switch (op) {
                case ACTIVATE -> e.activate(actor, now);
                case INACTIVATE -> e.inactivate(actor, now);
                case DELETE -> e.delete(actor, now);
                case RESTORE -> e.restore(actor, now);
                default -> throw new IllegalArgumentException();
              }
              return completed(c, repository.saveAndFlush(e), op, expected, before);
            });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  private Map<UUID, CentralRegulationGroupEntity> tree() {
    return repository.findAllByOrderByIdAsc().stream()
        .collect(Collectors.toMap(CentralRegulationGroupEntity::getId, Function.identity()));
  }

  private void requireGuard(RevisionExecutionContext c) {
    guard.requireHierarchyGuard(c, MasterDataHierarchyKey.REGULATION);
  }

  private CentralRegulationGroupEntity lock(UUID id) {
    return repository.lockById(id).orElseThrow(() -> notFound(id));
  }

  private NotFoundException notFound(UUID id) {
    return new NotFoundException(
        "MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound", "Regulation Group not found", id);
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

  private Map<String, ?> typed(CentralRegulationGroupEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("parentGroupId", e.getParentGroupId());
    m.put("sortOrder", e.getSortOrder());
    return m;
  }

  private JsonNode snapshot(CentralRegulationGroupEntity e) {
    return support.snapshot(e, typed(e));
  }

  private RevisionOperationResult completed(
      RevisionExecutionContext c,
      CentralRegulationGroupEntity e,
      RevisionOperationType o,
      Long v,
      JsonNode b) {
    return support.completed(c, e, RevisionEntityType.CENTRAL_REGULATION_GROUP, o, v, b, typed(e));
  }

  private boolean empty(DocumentAggregateBatchRequest r) {
    return r == null
        || (r.newDocuments().isEmpty()
            && r.newVersions().isEmpty()
            && r.metadataUpdates().isEmpty());
  }
}
