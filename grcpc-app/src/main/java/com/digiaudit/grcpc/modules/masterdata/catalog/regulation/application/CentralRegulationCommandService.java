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
import com.digiaudit.grcpc.modules.masterdata.shared.domain.*;
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
  private final MasterDataRevisionCoordinator revisions;
  private final MasterDataRevisionActorProvider actors;
  private final RevisionMutationGuard guard;
  private final DocumentCommandService documents;
  private final CatalogCommandSupport support;
  private final Clock clock;

  public CentralRegulationCommandService(
      CentralRegulationRepository r,
      CentralRegulationGroupRepository groups,
      CentralRegulationRequirementRepository requirements,
      MasterDataRevisionCoordinator revisions,
      MasterDataRevisionActorProvider actors,
      RevisionMutationGuard guard,
      DocumentCommandService documents,
      CatalogCommandSupport support,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    repository = r;
    this.groups = groups;
    this.requirements = requirements;
    this.revisions = revisions;
    this.actors = actors;
    this.guard = guard;
    this.documents = documents;
    this.support = support;
    this.clock = clock;
  }

  public MasterDataAggregateMutationResponse create(CentralRegulationDtos.CreateRegulation r) {
    String code = support.normalizeCode(r.code()),
        title = support.normalizeTitle(r.title()),
        description = support.normalizeDescription(r.description());
    int sort = support.normalizeSortOrder(r.sortOrder());
    support.validateValidity(r.validFrom(), r.validTo());
    AtomicReference<List<DocumentCommandResponse>> docs = new AtomicReference<>(List.of());
    try {
      var result =
          revisions.executeStructural(
              MasterDataHierarchyKey.REGULATION,
              RevisionRequest.central(
                  "Create regulation " + code, "Regulation structural create", null),
              c -> {
                requireGuard(c);
                requireGroup(r.regulationGroupId());
                var prepared = documents.prepareAggregate(r.documents());
                var e = repository.findByCode(code).orElse(null);
                RevisionOperationType op;
                Long expected;
                JsonNode before;
                UUID actor = actors.currentActorId();
                Instant now = Instant.now(clock);
                if (e == null) {
                  e =
                      CentralRegulationEntity.create(
                          UUID.randomUUID(),
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
                docs.set(
                    documents.finalizePreparedAggregate(
                        prepared,
                        DocumentLinkTargetType.CENTRAL_REGULATION,
                        saved.getId(),
                        "CENTRAL_REGULATION_CREATE"));
                return completed(c, saved, op, expected, before);
              });
      return support.aggregateResponse(result, docs.get());
    } catch (DataIntegrityViolationException e) {
      throw support.translateBusinessKeyViolation(e, "UK_CENTRAL_REGULATION_CODE", code);
    }
  }

  public MasterDataAggregateMutationResponse update(
      UUID id, CentralRegulationDtos.UpdateRegulation r) {
    long expected = support.requireVersion(r.version());
    String title = support.normalizeTitle(r.title()),
        description = support.normalizeDescription(r.description());
    support.validateValidity(r.validFrom(), r.validTo());
    AtomicReference<List<DocumentCommandResponse>> docs = new AtomicReference<>(List.of());
    var result =
        revisions.execute(
            RevisionRequest.central(
                "Update regulation " + id, "Regulation definition update", null),
            c -> {
              var prepared = documents.prepareAggregate(r.documents());
              var e = lock(id);
              support.assertVersion(e, expected);
              if (e.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
              if (Objects.equals(e.getTitle(), title)
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
              var saved = repository.saveAndFlush(e);
              docs.set(
                  documents.finalizePreparedAggregate(
                      prepared,
                      DocumentLinkTargetType.CENTRAL_REGULATION,
                      id,
                      "CENTRAL_REGULATION_UPDATE"));
              return completed(c, saved, RevisionOperationType.UPDATE, expected, before);
            });
    return support.aggregateResponse(result, docs.get());
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
                  && requirements.existsByRegulationIdAndStatusNot(
                      id, MasterDataLifecycleStatus.DELETED))
                throw new ConflictException(
                    "DEPENDENCY_EXISTS",
                    "error.masterdata.v2.dependencyExists",
                    "Regulation has nondeleted requirements",
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
