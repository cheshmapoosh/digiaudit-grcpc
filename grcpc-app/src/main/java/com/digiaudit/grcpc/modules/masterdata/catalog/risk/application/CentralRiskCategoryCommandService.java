package com.digiaudit.grcpc.modules.masterdata.catalog.risk.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.CreateCentralRiskCategoryRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.MoveCentralRiskCategoryRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.UpdateCentralRiskCategoryRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskCategoryEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.repository.CentralRiskCategoryRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.repository.CentralRiskTemplateRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogHierarchySupport;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionActorProvider;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionCoordinator;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionResult;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionMutationGuard;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionOperationResult;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionRequest;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataAggregateMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class CentralRiskCategoryCommandService {
  private final CentralRiskCategoryRepository repository;
  private final CentralRiskTemplateRepository templateRepository;
  private final MasterDataRevisionCoordinator revisions;
  private final MasterDataRevisionActorProvider actors;
  private final RevisionMutationGuard mutationGuard;
  private final DocumentCommandService documents;
  private final CatalogCommandSupport support;
  private final CatalogHierarchySupport hierarchySupport;
  private final Clock clock;

  public CentralRiskCategoryCommandService(
      CentralRiskCategoryRepository repository,
      CentralRiskTemplateRepository templateRepository,
      MasterDataRevisionCoordinator revisions,
      MasterDataRevisionActorProvider actors,
      RevisionMutationGuard mutationGuard,
      DocumentCommandService documents,
      CatalogCommandSupport support,
      CatalogHierarchySupport hierarchySupport,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.repository = repository;
    this.templateRepository = templateRepository;
    this.revisions = revisions;
    this.actors = actors;
    this.mutationGuard = mutationGuard;
    this.documents = documents;
    this.support = support;
    this.hierarchySupport = hierarchySupport;
    this.clock = clock;
  }

  public MasterDataAggregateMutationResponse create(CreateCentralRiskCategoryRequest request) {
    String code = support.normalizeCode(request.code());
    String title = support.normalizeTitle(request.title());
    String description = support.normalizeDescription(request.description());
    int sortOrder = support.normalizeSortOrder(request.sortOrder());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<List<DocumentCommandResponse>> finalized = new AtomicReference<>(List.of());
    try {
      RevisionExecutionResult result =
          revisions.executeStructural(
              MasterDataHierarchyKey.RISK,
              RevisionRequest.central(
                  "Create risk category " + code, "Risk Category structural create", null),
              context -> {
                requireGuard(context);
                var prepared = documents.prepareAggregate(request.documents());
                Map<UUID, CentralRiskCategoryEntity> hierarchy = hierarchy();
                CentralRiskCategoryEntity entity = repository.findByCode(code).orElse(null);
                RevisionOperationType operationType;
                Long expectedVersion;
                JsonNode before;
                UUID actor = actors.currentActorId();
                Instant now = Instant.now(clock);
                UUID id = entity == null ? UUID.randomUUID() : entity.getId();
                hierarchySupport.requireParent(
                    id, request.parentCategoryId(), hierarchy, "Risk Category parent");
                hierarchySupport.rejectCycle(
                    id,
                    request.parentCategoryId(),
                    hierarchy,
                    CentralRiskCategoryEntity::getParentCategoryId);
                if (entity == null) {
                  entity =
                      CentralRiskCategoryEntity.create(
                          id,
                          code,
                          title,
                          request.parentCategoryId(),
                          description,
                          sortOrder,
                          request.validFrom(),
                          request.validTo(),
                          actor,
                          now);
                  operationType = RevisionOperationType.CREATE;
                  expectedVersion = null;
                  before = null;
                } else {
                  if (entity.getStatus() == MasterDataLifecycleStatus.ACTIVE)
                    throw support.duplicate(code);
                  if (!Objects.equals(entity.getParentCategoryId(), request.parentCategoryId()))
                    throw parentMismatch();
                  expectedVersion = entity.getVersion();
                  before = snapshot(entity);
                  if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) {
                    entity.restoreFromCreate(
                        title,
                        request.parentCategoryId(),
                        description,
                        sortOrder,
                        request.validFrom(),
                        request.validTo(),
                        actor,
                        now);
                    operationType = RevisionOperationType.RESTORE;
                  } else {
                    entity.reactivateFromCreate(
                        title,
                        request.parentCategoryId(),
                        description,
                        sortOrder,
                        request.validFrom(),
                        request.validTo(),
                        actor,
                        now);
                    operationType = RevisionOperationType.ACTIVATE;
                  }
                }
                CentralRiskCategoryEntity saved = repository.saveAndFlush(entity);
                finalized.set(
                    documents.finalizePreparedAggregate(
                        prepared,
                        DocumentLinkTargetType.CENTRAL_RISK_CATEGORY,
                        saved.getId(),
                        "CENTRAL_RISK_CREATE"));
                return completed(context, saved, operationType, expectedVersion, before);
              });
      return support.aggregateResponse(result, finalized.get());
    } catch (DataIntegrityViolationException exception) {
      throw support.translateBusinessKeyViolation(exception, "UK_CENTRAL_RISK_CATEGORY_CODE", code);
    }
  }

  public MasterDataAggregateMutationResponse update(
      UUID id, UpdateCentralRiskCategoryRequest request) {
    long expectedVersion = support.requireVersion(request.version());
    String title = support.normalizeTitle(request.title());
    String description = support.normalizeDescription(request.description());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<List<DocumentCommandResponse>> finalized = new AtomicReference<>(List.of());
    RevisionExecutionResult result =
        revisions.execute(
            RevisionRequest.central(
                "Update risk category " + id, "Risk Category definition update", null),
            context -> {
              var prepared = documents.prepareAggregate(request.documents());
              CentralRiskCategoryEntity entity = lock(id);
              support.assertVersion(entity, expectedVersion);
              if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
              if (same(entity, title, description, request) && empty(request.documents()))
                throw noChange();
              JsonNode before = snapshot(entity);
              entity.update(
                  title,
                  description,
                  request.validFrom(),
                  request.validTo(),
                  actors.currentActorId(),
                  Instant.now(clock));
              CentralRiskCategoryEntity saved = repository.saveAndFlush(entity);
              finalized.set(
                  documents.finalizePreparedAggregate(
                      prepared,
                      DocumentLinkTargetType.CENTRAL_RISK_CATEGORY,
                      id,
                      "CENTRAL_RISK_UPDATE"));
              return completed(
                  context, saved, RevisionOperationType.UPDATE, expectedVersion, before);
            });
    return support.aggregateResponse(result, finalized.get());
  }

  public MasterDataRevisionMutationResponse move(UUID id, MoveCentralRiskCategoryRequest request) {
    long expectedVersion = support.requireVersion(request.version());
    int sortOrder = support.normalizeSortOrder(request.sortOrder());
    RevisionExecutionResult result =
        revisions.executeStructural(
            MasterDataHierarchyKey.RISK,
            RevisionRequest.central(
                "Move risk category " + id, "Risk Category hierarchy move", null),
            context -> {
              requireGuard(context);
              Map<UUID, CentralRiskCategoryEntity> hierarchy = hierarchy();
              CentralRiskCategoryEntity entity = hierarchy.get(id);
              if (entity == null) throw notFound(id);
              support.assertVersion(entity, expectedVersion);
              entity.requireNotDeleted();
              hierarchySupport.requireParent(
                  id, request.parentCategoryId(), hierarchy, "Risk Category parent");
              hierarchySupport.rejectCycle(
                  id,
                  request.parentCategoryId(),
                  hierarchy,
                  CentralRiskCategoryEntity::getParentCategoryId);
              if (Objects.equals(entity.getParentCategoryId(), request.parentCategoryId())
                  && entity.getSortOrder() == sortOrder) throw invalidHierarchyMove();
              JsonNode before = snapshot(entity);
              entity.move(
                  request.parentCategoryId(),
                  sortOrder,
                  actors.currentActorId(),
                  Instant.now(clock));
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
      UUID id, Long version, RevisionOperationType operationType) {
    long expectedVersion = support.requireVersion(version);
    RevisionExecutionResult result =
        revisions.executeStructural(
            MasterDataHierarchyKey.RISK,
            RevisionRequest.central(
                operationType + " risk category " + id, "Risk Category lifecycle", null),
            context -> {
              requireGuard(context);
              Map<UUID, CentralRiskCategoryEntity> hierarchy = hierarchy();
              CentralRiskCategoryEntity entity = hierarchy.get(id);
              if (entity == null) throw notFound(id);
              support.assertVersion(entity, expectedVersion);
              support.validateLifecycle(entity, operationType);
              if (operationType == RevisionOperationType.DELETE
                  && (repository.existsByParentCategoryIdAndStatusNot(
                          id, MasterDataLifecycleStatus.DELETED)
                      || templateRepository.existsByRiskCategoryIdAndStatusNot(
                          id, MasterDataLifecycleStatus.DELETED))) {
                throw new ConflictException(
                    "DEPENDENCY_EXISTS",
                    "error.masterdata.v2.dependencyExists",
                    "Risk Category has nondeleted children",
                    id);
              }
              if (operationType == RevisionOperationType.ACTIVATE
                  || operationType == RevisionOperationType.RESTORE) {
                hierarchySupport.requireParent(
                    id, entity.getParentCategoryId(), hierarchy, "Risk Category parent");
                hierarchySupport.rejectCycle(
                    id,
                    entity.getParentCategoryId(),
                    hierarchy,
                    CentralRiskCategoryEntity::getParentCategoryId);
              }
              JsonNode before = snapshot(entity);
              UUID actor = actors.currentActorId();
              Instant now = Instant.now(clock);
              switch (operationType) {
                case ACTIVATE -> entity.activate(actor, now);
                case INACTIVATE -> entity.inactivate(actor, now);
                case DELETE -> entity.delete(actor, now);
                case RESTORE -> entity.restore(actor, now);
                default -> throw new IllegalArgumentException("Unsupported lifecycle operation");
              }
              return completed(
                  context, repository.saveAndFlush(entity), operationType, expectedVersion, before);
            });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  private Map<UUID, CentralRiskCategoryEntity> hierarchy() {
    return repository.findAllByOrderByIdAsc().stream()
        .collect(Collectors.toMap(CentralRiskCategoryEntity::getId, Function.identity()));
  }

  private void requireGuard(RevisionExecutionContext context) {
    mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.RISK);
  }

  private CentralRiskCategoryEntity lock(UUID id) {
    return repository.lockById(id).orElseThrow(() -> notFound(id));
  }

  private NotFoundException notFound(UUID id) {
    return new NotFoundException(
        "MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound", "Risk Category not found", id);
  }

  private UnprocessableEntityException parentMismatch() {
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

  private JsonNode snapshot(CentralRiskCategoryEntity e) {
    return support.snapshot(e, typed(e));
  }

  private Map<String, ?> typed(CentralRiskCategoryEntity e) {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("parentCategoryId", e.getParentCategoryId());
    fields.put("sortOrder", e.getSortOrder());
    return fields;
  }

  private RevisionOperationResult completed(
      RevisionExecutionContext c,
      CentralRiskCategoryEntity e,
      RevisionOperationType o,
      Long v,
      JsonNode b) {
    return support.completed(c, e, RevisionEntityType.CENTRAL_RISK_CATEGORY, o, v, b, typed(e));
  }

  private boolean same(
      CentralRiskCategoryEntity e, String t, String d, UpdateCentralRiskCategoryRequest r) {
    return Objects.equals(e.getTitle(), t)
        && Objects.equals(e.getDescription(), d)
        && Objects.equals(e.getValidFrom(), r.validFrom())
        && Objects.equals(e.getValidTo(), r.validTo());
  }

  private boolean empty(DocumentAggregateBatchRequest r) {
    return r == null
        || (r.newDocuments().isEmpty()
            && r.newVersions().isEmpty()
            && r.metadataUpdates().isEmpty());
  }
}
