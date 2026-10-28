package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.application;

import com.digiaudit.grcpc.common.exception.*;
import com.digiaudit.grcpc.modules.document.api.dto.*;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.CentralRegulationDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.*;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataStructuralDependencyChecker;
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
public class CentralRegulationRequirementCommandService {
  private final CentralRegulationRequirementRepository repository;
  private final CentralRegulationRepository regulations;
  private final MasterDataRevisionCoordinator revisions;
  private final MasterDataRevisionActorProvider actors;
  private final RevisionMutationGuard guard;
  private final DocumentCommandService documents;
  private final CatalogCommandSupport support;
  private final MasterDataStructuralDependencyChecker dependencyChecker;
  private final Clock clock;
  private final CentralRegulationMapper mapper;

  public CentralRegulationRequirementCommandService(
      CentralRegulationRequirementRepository r,
      CentralRegulationRepository regulations,
      MasterDataRevisionCoordinator revisions,
      MasterDataRevisionActorProvider actors,
      RevisionMutationGuard guard,
      DocumentCommandService documents,
      CatalogCommandSupport support,
      MasterDataStructuralDependencyChecker dependencyChecker,
      @Qualifier("masterDataRevisionClock") Clock clock, CentralRegulationMapper mapper) {
    repository = r;
    this.regulations = regulations;
    this.revisions = revisions;
    this.actors = actors;
    this.guard = guard;
    this.documents = documents;
    this.support = support;
    this.dependencyChecker = dependencyChecker;
    this.clock = clock;
    this.mapper = mapper;
  }

  public CentralRegulationDtos.RequirementAggregateResponse create(CentralRegulationDtos.CreateRequirement r) {
    String code = support.normalizeCode(r.code()),
        title = support.normalizeTitle(r.title()),
        description = support.normalizeDescription(r.description());
    int sort = support.normalizeSortOrder(r.sortOrder());
    support.validateValidity(r.validFrom(), r.validTo());
    AtomicReference<CentralRegulationDtos.RequirementDetail> canonical = new AtomicReference<>();
    AtomicReference<List<DocumentCommandResponse>> docs = new AtomicReference<>(List.of());
    try {
      var result =
          revisions.executeStructural(
              MasterDataHierarchyKey.REGULATION,
              RevisionRequest.central(
                  "Create regulation requirement " + code, "Requirement structural create", null),
              c -> {
                requireGuard(c);
                requireRegulation(r.regulationId());
                var prepared = documents.prepareAggregate(r.documents());
                var e = repository.findByCode(code).orElse(null);
                RevisionOperationType op;
                Long expected;
                JsonNode before;
                UUID actor = actors.currentActorId();
                Instant now = Instant.now(clock);
                if (e == null) {
                  e =
                      CentralRegulationRequirementEntity.create(
                          UUID.randomUUID(),
                          code,
                          title,
                          r.regulationId(),
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
                  if (!e.getRegulationId().equals(r.regulationId())) throw invalidParent();
                  expected = e.getVersion();
                  before = snapshot(e);
                  if (e.getStatus() == MasterDataLifecycleStatus.DELETED) {
                    e.restoreFromCreate(
                        title,
                        r.regulationId(),
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
                        r.regulationId(),
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
                        DocumentLinkTargetType.CENTRAL_REGULATION_REQUIREMENT,
                        saved.getId(),
                        "MD_GOVERNANCE_MANAGE"));
                return completed(c, saved, op, expected, before);
              });
      return new CentralRegulationDtos.RequirementAggregateResponse(result.primaryResult().entityId(), result.primaryResult().revisionId(),
          result.primaryResult().version(), docs.get(), canonical.get());
    } catch (DataIntegrityViolationException e) {
      throw support.translateBusinessKeyViolation(e, "UK_CENTRAL_REG_REQUIREMENT_CODE", code);
    }
  }

  public CentralRegulationDtos.RequirementAggregateResponse update(
      UUID id, CentralRegulationDtos.UpdateRequirement r) {
    long expected = support.requireVersion(r.version());
    String title = support.normalizeTitle(r.title()),
        description = support.normalizeDescription(r.description());
    support.validateValidity(r.validFrom(), r.validTo());
    AtomicReference<CentralRegulationDtos.RequirementDetail> canonical = new AtomicReference<>();
    AtomicReference<List<DocumentCommandResponse>> docs = new AtomicReference<>(List.of());
    var result =
        revisions.executeStructural(
            java.util.List.of(MasterDataHierarchyKey.CONTROL, MasterDataHierarchyKey.REGULATION),
            RevisionRequest.central(
                "Update regulation requirement " + id, "Requirement definition update", null),
            c -> {
              requireGuard(c);
              var prepared = documents.prepareAggregate(r.documents());
              var e = lock(id);
              support.assertVersion(e, expected);
              if (e.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
              UUID parentId = r.parentChange() == null ? e.getRegulationId() : r.parentChange().regulationId();
              int sortOrder = r.sortOrder() == null ? e.getSortOrder() : support.normalizeSortOrder(r.sortOrder());
              MasterDataLifecycleStatus status = r.status() == null ? e.getStatus() : r.status();
              if (status == MasterDataLifecycleStatus.DELETED) throw new UnprocessableEntityException(
                  "INVALID_STATUS", "error.masterdata.v2.invalidLifecycleTransition", "Update accepts ACTIVE or INACTIVE only");
              if (parentId == null) throw invalidParent();
              requireRegulation(parentId);

              if (Objects.equals(e.getRegulationId(), parentId)
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
                      DocumentLinkTargetType.CENTRAL_REGULATION_REQUIREMENT,
                      id,
                      "MD_GOVERNANCE_MANAGE"));
              return completed(c, saved, RevisionOperationType.UPDATE, expected, before);
            });
    return new CentralRegulationDtos.RequirementAggregateResponse(result.primaryResult().entityId(), result.primaryResult().revisionId(),
          result.primaryResult().version(), docs.get(), canonical.get());
  }

  public MasterDataRevisionMutationResponse move(UUID id, CentralRegulationDtos.MoveRequirement r) {
    long expected = support.requireVersion(r.version());
    int sort = support.normalizeSortOrder(r.sortOrder());
    var result =
        revisions.executeStructural(
            MasterDataHierarchyKey.REGULATION,
            RevisionRequest.central(
                "Move regulation requirement " + id, "Requirement regulation move", null),
            c -> {
              requireGuard(c);
              requireRegulation(r.regulationId());
              var e = lock(id);
              support.assertVersion(e, expected);
              e.requireNotDeleted();
              if (e.getRegulationId().equals(r.regulationId()) && e.getSortOrder() == sort)
                throw invalidHierarchyMove();
              JsonNode before = snapshot(e);
              e.move(r.regulationId(), sort, actors.currentActorId(), Instant.now(clock));
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
            java.util.List.of(MasterDataHierarchyKey.CONTROL, MasterDataHierarchyKey.REGULATION),
            RevisionRequest.central(
                op + " regulation requirement " + id, "Requirement lifecycle", null),
            c -> {
              requireGuard(c);
              var e = lock(id);
              support.assertVersion(e, expected);
              support.validateLifecycle(e, op);
              if (op == RevisionOperationType.DELETE
                  && dependencyChecker.centralRegulationRequirementHasApprovedDependencies(id))
                throw new ConflictException(
                    "DEPENDENCY_EXISTS",
                    "error.masterdata.v2.dependencyExists",
                    "Regulation Requirement has approved scope dependencies",
                    id);
              if (op == RevisionOperationType.ACTIVATE || op == RevisionOperationType.RESTORE)
                requireRegulation(e.getRegulationId());
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

  private void requireRegulation(UUID id) {
    var e =
        regulations
            .findById(id)
            .orElseThrow(
                () ->
                    new NotFoundException(
                        "PARENT_NOT_FOUND",
                        "error.masterdata.v2.parentNotFound",
                        "Regulation not found",
                        id));
    if (e.getStatus() == MasterDataLifecycleStatus.DELETED)
      throw new UnprocessableEntityException(
          "INVALID_PARENT", "error.masterdata.v2.invalidParent", "Regulation is deleted");
  }

  private void requireGuard(RevisionExecutionContext c) {
    guard.requireHierarchyGuard(c, MasterDataHierarchyKey.REGULATION);
  }

  private CentralRegulationRequirementEntity lock(UUID id) {
    return repository.lockById(id).orElseThrow(() -> notFound(id));
  }

  private NotFoundException notFound(UUID id) {
    return new NotFoundException(
        "MASTER_DATA_NOT_FOUND",
        "error.masterdata.v2.notFound",
        "Regulation Requirement not found",
        id);
  }

  private UnprocessableEntityException invalidParent() {
    return new UnprocessableEntityException(
        "INVALID_PARENT",
        "error.masterdata.v2.invalidParent",
        "Create cannot change the stored regulation");
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

  private Map<String, ?> typed(CentralRegulationRequirementEntity e) {
    return Map.of("regulationId", e.getRegulationId(), "sortOrder", e.getSortOrder());
  }

  private JsonNode snapshot(CentralRegulationRequirementEntity e) {
    return support.snapshot(e, typed(e));
  }

  private RevisionOperationResult completed(
      RevisionExecutionContext c,
      CentralRegulationRequirementEntity e,
      RevisionOperationType o,
      Long v,
      JsonNode b) {
    return support.completed(
        c, e, RevisionEntityType.CENTRAL_REGULATION_REQUIREMENT, o, v, b, typed(e));
  }

  private boolean empty(DocumentAggregateBatchRequest r) {
    return r == null
        || (r.newDocuments().isEmpty()
            && r.newVersions().isEmpty()
            && r.metadataUpdates().isEmpty());
  }
}
