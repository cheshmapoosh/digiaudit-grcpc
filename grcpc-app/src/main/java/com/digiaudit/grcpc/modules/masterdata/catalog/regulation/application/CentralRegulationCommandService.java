package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.application;

import com.digiaudit.grcpc.common.exception.*;
import com.digiaudit.grcpc.modules.document.api.dto.*;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.CentralRegulationDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain.GlobalControlRegulationRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.*;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.mapper.CentralRegulationMapper;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class CentralRegulationCommandService {
  private final CentralRegulationRepository repository;
  private final CentralRegulationGroupRepository groups;
  private final CentralRegulationRequirementRepository requirements;
  private final GlobalControlRegulationRepository globalControlRelations;
  private final MasterDataRevisionCoordinator revisions;
  private final MasterDataRevisionActorProvider actors;
  private final RevisionMutationGuard guard;
  private final DocumentCommandService documents;
  private final CatalogCommandSupport support;
  private final Clock clock;
  private final CentralRegulationMapper mapper;
  private final RegulationRequirementAggregateService requirementDrafts;

  public CentralRegulationCommandService(
      CentralRegulationRepository r,
      CentralRegulationGroupRepository groups,
      CentralRegulationRequirementRepository requirements,
      GlobalControlRegulationRepository globalControlRelations,
      MasterDataRevisionCoordinator revisions,
      MasterDataRevisionActorProvider actors,
      RevisionMutationGuard guard,
      DocumentCommandService documents,
      CatalogCommandSupport support,
      @Qualifier("masterDataRevisionClock") Clock clock, CentralRegulationMapper mapper,
      RegulationRequirementAggregateService requirementDrafts) {
    repository = r;
    this.groups = groups;
    this.requirements = requirements;
    this.globalControlRelations = globalControlRelations;
    this.revisions = revisions;
    this.actors = actors;
    this.guard = guard;
    this.documents = documents;
    this.support = support;
    this.clock = clock;
    this.mapper = mapper;
    this.requirementDrafts = requirementDrafts;
  }

  public CentralRegulationDtos.RegulationAggregateResponse create(CentralRegulationDtos.CreateRegulation r) {
    String code = support.normalizeCode(r.code()),
        title = support.normalizeTitle(r.title()),
        description = support.normalizeDescription(r.description());
    int sort = support.normalizeSortOrder(r.sortOrder());
    support.validateValidity(r.validFrom(), r.validTo());
    AtomicReference<CentralRegulationDtos.RegulationDetail> canonical = new AtomicReference<>();
    AtomicReference<List<DocumentCommandResponse>> docs = new AtomicReference<>(List.of());
    AtomicReference<List<CentralRegulationDtos.RequirementDetail>> childRows = new AtomicReference<>(List.of());
    try {
      var result =
          revisions.executeStructural(
              guardKeys(r.requirementChanges()),
              RevisionRequest.central(
                  "Create regulation " + code, "Regulation structural create", null),
              c -> {
                requireGuard(c);
                requireGroup(r.regulationGroupId());
                var prepared = documents.prepareAggregate(r.documents());
                var e = repository.findByCode(code).orElse(null);
                if (e != null && e.getStatus() == MasterDataLifecycleStatus.ACTIVE) throw support.duplicate(code);
                if (e != null && !e.getRegulationGroupId().equals(r.regulationGroupId())) throw invalidParent();
                UUID sourceId = e == null ? UUID.randomUUID() : e.getId();
                var childPlan = requirementDrafts.prepare(sourceId, r.requirementChanges(), c);
                RevisionOperationType op;
                Long expected;
                JsonNode before;
                UUID actor = actors.currentActorId();
                Instant now = Instant.now(clock);
                if (e == null) {
                  e =
                      CentralRegulationEntity.create(
                          sourceId,
                          code,
                          title,
                          r.regulationGroupId(),
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
                  if (!e.getRegulationGroupId().equals(r.regulationGroupId()))
                    throw invalidParent();
                  expected = e.getVersion();
                  before = snapshot(e);
                  if (e.getStatus() == MasterDataLifecycleStatus.DELETED) {
                    e.restoreFromCreate(
                        title,
                        r.regulationGroupId(),
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
                        r.regulationGroupId(),
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
                var children = requirementDrafts.apply(childPlan, c);
                childRows.set(children.requirements());
              canonical.set(mapper.detail(saved));
                docs.set(
                    documents.finalizePreparedAggregate(
                        prepared,
                        DocumentLinkTargetType.CENTRAL_REGULATION,
                        saved.getId(),
                        "MD_GOVERNANCE_MANAGE"));
                return combine(c, completed(c, saved, op, expected, before), children.contents());
              });
      return new CentralRegulationDtos.RegulationAggregateResponse(result.primaryResult().entityId(), result.primaryResult().revisionId(),
          result.primaryResult().version(), docs.get(), canonical.get(), childRows.get());
    } catch (DataIntegrityViolationException e) {
      throw support.translateBusinessKeyViolation(e, "UK_CENTRAL_REGULATION_CODE", code);
    }
  }

  public CentralRegulationDtos.RegulationAggregateResponse update(
      UUID id, CentralRegulationDtos.UpdateRegulation r) {
    long expected = support.requireVersion(r.version());
    String title = support.normalizeTitle(r.title()),
        description = support.normalizeDescription(r.description());
    support.validateValidity(r.validFrom(), r.validTo());
    AtomicReference<CentralRegulationDtos.RegulationDetail> canonical = new AtomicReference<>();
    AtomicReference<List<DocumentCommandResponse>> docs = new AtomicReference<>(List.of());
    AtomicReference<List<CentralRegulationDtos.RequirementDetail>> childRows = new AtomicReference<>(List.of());
    var result =
        revisions.executeStructural(
            guardKeys(r.requirementChanges()),
            RevisionRequest.central(
                "Update regulation " + id, "Regulation definition update", null),
            c -> {
              requireGuard(c);
              var prepared = documents.prepareAggregate(r.documents());
              var e = lock(id);
              support.assertVersion(e, expected);
              if (e.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
              UUID parentId = r.parentChange() == null ? e.getRegulationGroupId() : r.parentChange().regulationGroupId();
              int sortOrder = r.sortOrder() == null ? e.getSortOrder() : support.normalizeSortOrder(r.sortOrder());
              MasterDataLifecycleStatus status = r.status() == null ? e.getStatus() : r.status();
              if (status == MasterDataLifecycleStatus.DELETED) throw new UnprocessableEntityException(
                  "INVALID_STATUS", "error.masterdata.v2.invalidLifecycleTransition", "Update accepts ACTIVE or INACTIVE only");
              if (parentId == null) throw invalidParent();
              requireGroup(parentId);
              var childPlan = requirementDrafts.prepare(id, r.requirementChanges(), c);

              if (Objects.equals(e.getRegulationGroupId(), parentId)
                  && e.getSortOrder() == sortOrder
                  && e.getStatus() == status
                  && Objects.equals(e.getTitle(), title)
                  && Objects.equals(e.getDescription(), description)
                  && Objects.equals(e.getValidFrom(), r.validFrom())
                  && Objects.equals(e.getValidTo(), r.validTo())
                  && empty(r.documents()) && !childPlan.changed()) throw noChange();
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
              var children = requirementDrafts.apply(childPlan, c);
              childRows.set(children.requirements());
              canonical.set(mapper.detail(saved));
              docs.set(
                  documents.finalizePreparedAggregate(
                      prepared,
                      DocumentLinkTargetType.CENTRAL_REGULATION,
                      id,
                      "MD_GOVERNANCE_MANAGE"));
              return combine(c, completed(c, saved, RevisionOperationType.UPDATE, expected, before), children.contents());
            });
    return new CentralRegulationDtos.RegulationAggregateResponse(result.primaryResult().entityId(), result.primaryResult().revisionId(),
          result.primaryResult().version(), docs.get(), canonical.get(), childRows.get());
  }

  public MasterDataRevisionMutationResponse move(UUID id, CentralRegulationDtos.MoveRegulation r) {
    long expected = support.requireVersion(r.version());
    int sort = support.normalizeSortOrder(r.sortOrder());
    var result =
        revisions.executeStructural(
            MasterDataHierarchyKey.REGULATION,
            RevisionRequest.central("Move regulation " + id, "Regulation group move", null),
            c -> {
              requireGuard(c);
              requireGroup(r.regulationGroupId());
              var e = lock(id);
              support.assertVersion(e, expected);
              e.requireNotDeleted();
              if (e.getRegulationGroupId().equals(r.regulationGroupId())
                  && e.getSortOrder() == sort) throw invalidHierarchyMove();
              JsonNode before = snapshot(e);
              e.move(r.regulationGroupId(), sort, actors.currentActorId(), Instant.now(clock));
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
            RevisionRequest.central(op + " regulation " + id, "Regulation lifecycle", null),
            c -> {
              requireGuard(c);
              var e = lock(id);
              support.assertVersion(e, expected);
              support.validateLifecycle(e, op);
              if (op == RevisionOperationType.DELETE
                  && (requirements.existsByRegulationIdAndStatusNot(
                      id, MasterDataLifecycleStatus.DELETED)
                      || globalControlRelations.existsByRegulationIdAndStatusNot(
                          id, MasterDataLifecycleStatus.DELETED)))
                throw new ConflictException(
                    "DEPENDENCY_EXISTS",
                    "error.masterdata.v2.dependencyExists",
                    "Regulation has nondeleted requirements or Global Control relations",
                    id);
              if (op == RevisionOperationType.ACTIVATE || op == RevisionOperationType.RESTORE)
                requireGroup(e.getRegulationGroupId());
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

  private void requireGroup(UUID id) {
    var e =
        groups
            .findById(id)
            .orElseThrow(
                () ->
                    new NotFoundException(
                        "PARENT_NOT_FOUND",
                        "error.masterdata.v2.parentNotFound",
                        "Regulation Group not found",
                        id));
    if (e.getStatus() == MasterDataLifecycleStatus.DELETED)
      throw new UnprocessableEntityException(
          "INVALID_PARENT", "error.masterdata.v2.invalidParent", "Regulation Group is deleted");
  }

  private void requireGuard(RevisionExecutionContext c) {
    guard.requireHierarchyGuard(c, MasterDataHierarchyKey.REGULATION);
  }

  private List<MasterDataHierarchyKey> guardKeys(List<CentralRegulationDtos.RequirementChange> changes) {
    return changes == null || changes.isEmpty() ? List.of(MasterDataHierarchyKey.REGULATION)
        : List.of(MasterDataHierarchyKey.CONTROL, MasterDataHierarchyKey.REGULATION);
  }

  private RevisionOperationResult combine(RevisionExecutionContext context, RevisionOperationResult owner,
      List<RevisionContentResult> children) {
    var contents = new ArrayList<>(owner.contentResults());
    contents.addAll(children);
    return RevisionOperationResult.completed(context, owner.primaryResult(), contents);
  }

  private CentralRegulationEntity lock(UUID id) {
    return repository.lockById(id).orElseThrow(() -> notFound(id));
  }

  private NotFoundException notFound(UUID id) {
    return new NotFoundException(
        "MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound", "Regulation not found", id);
  }

  private UnprocessableEntityException invalidParent() {
    return new UnprocessableEntityException(
        "INVALID_PARENT",
        "error.masterdata.v2.invalidParent",
        "Create cannot change the stored group");
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

  private Map<String, ?> typed(CentralRegulationEntity e) {
    return Map.of("regulationGroupId", e.getRegulationGroupId(), "sortOrder", e.getSortOrder());
  }

  private JsonNode snapshot(CentralRegulationEntity e) {
    return support.snapshot(e, typed(e));
  }

  private RevisionOperationResult completed(
      RevisionExecutionContext c,
      CentralRegulationEntity e,
      RevisionOperationType o,
      Long v,
      JsonNode b) {
    return support.completed(c, e, RevisionEntityType.CENTRAL_REGULATION, o, v, b, typed(e));
  }

  private boolean empty(DocumentAggregateBatchRequest r) {
    return r == null
        || (r.newDocuments().isEmpty()
            && r.newVersions().isEmpty()
            && r.metadataUpdates().isEmpty());
  }
}
