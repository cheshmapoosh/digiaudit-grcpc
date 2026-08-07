package com.digiaudit.grcpc.modules.masterdata.catalog.risk.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.CreateCentralRiskTemplateRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.MoveCentralRiskTemplateRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.UpdateCentralRiskTemplateRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskCategoryEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskTemplateEntity;
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
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataStructuralDependencyChecker;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Clock;
import java.time.Instant;
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
public class CentralRiskTemplateCommandService {
  private final CentralRiskTemplateRepository repository;
  private final CentralRiskCategoryRepository categoryRepository;
  private final MasterDataRevisionCoordinator revisions;
  private final MasterDataRevisionActorProvider actors;
  private final RevisionMutationGuard mutationGuard;
  private final DocumentCommandService documents;
  private final CatalogCommandSupport support;
  private final CatalogHierarchySupport hierarchySupport;
  private final MasterDataStructuralDependencyChecker dependencyChecker;
  private final Clock clock;

  public CentralRiskTemplateCommandService(
      CentralRiskTemplateRepository repository,
      CentralRiskCategoryRepository categoryRepository,
      MasterDataRevisionCoordinator revisions,
      MasterDataRevisionActorProvider actors,
      RevisionMutationGuard mutationGuard,
      DocumentCommandService documents,
      CatalogCommandSupport support,
      CatalogHierarchySupport hierarchySupport,
      MasterDataStructuralDependencyChecker dependencyChecker,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.repository = repository;
    this.categoryRepository = categoryRepository;
    this.revisions = revisions;
    this.actors = actors;
    this.mutationGuard = mutationGuard;
    this.documents = documents;
    this.support = support;
    this.hierarchySupport = hierarchySupport;
    this.dependencyChecker = dependencyChecker;
    this.clock = clock;
  }

  public MasterDataAggregateMutationResponse create(CreateCentralRiskTemplateRequest request) {
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
                  "Create risk template " + code, "Risk Template structural create", null),
              context -> {
                requireGuard(context);
                var prepared = documents.prepareAggregate(request.documents());
                Map<UUID, CentralRiskCategoryEntity> categories = categories();
                requireCategory(request.riskCategoryId(), categories);
                CentralRiskTemplateEntity entity = repository.findByCode(code).orElse(null);
                RevisionOperationType operationType;
                Long expectedVersion;
                JsonNode before;
                UUID actor = actors.currentActorId();
                Instant now = Instant.now(clock);
                if (entity == null) {
                  entity =
                      CentralRiskTemplateEntity.create(
                          UUID.randomUUID(),
                          code,
                          title,
                          request.riskCategoryId(),
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
                  if (!entity.getRiskCategoryId().equals(request.riskCategoryId()))
                    throw parentMismatch();
                  expectedVersion = entity.getVersion();
                  before = snapshot(entity);
                  if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) {
                    entity.restoreFromCreate(
                        title,
                        request.riskCategoryId(),
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
                        request.riskCategoryId(),
                        description,
                        sortOrder,
                        request.validFrom(),
                        request.validTo(),
                        actor,
                        now);
                    operationType = RevisionOperationType.ACTIVATE;
                  }
                }
                CentralRiskTemplateEntity saved = repository.saveAndFlush(entity);
                finalized.set(
                    documents.finalizePreparedAggregate(
                        prepared,
                        DocumentLinkTargetType.CENTRAL_RISK_TEMPLATE,
                        saved.getId(),
                        "CENTRAL_RISK_CREATE"));
                return completed(context, saved, operationType, expectedVersion, before);
              });
      return support.aggregateResponse(result, finalized.get());
    } catch (DataIntegrityViolationException exception) {
      throw support.translateBusinessKeyViolation(exception, "UK_CENTRAL_RISK_TEMPLATE_CODE", code);
    }
  }

  public MasterDataAggregateMutationResponse update(
      UUID id, UpdateCentralRiskTemplateRequest request) {
    long expectedVersion = support.requireVersion(request.version());
    String title = support.normalizeTitle(request.title());
    String description = support.normalizeDescription(request.description());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<List<DocumentCommandResponse>> finalized = new AtomicReference<>(List.of());
    RevisionExecutionResult result =
        revisions.execute(
            RevisionRequest.central(
                "Update risk template " + id, "Risk Template definition update", null),
            context -> {
              var prepared = documents.prepareAggregate(request.documents());
              CentralRiskTemplateEntity entity = lock(id);
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
              CentralRiskTemplateEntity saved = repository.saveAndFlush(entity);
              finalized.set(
                  documents.finalizePreparedAggregate(
                      prepared,
                      DocumentLinkTargetType.CENTRAL_RISK_TEMPLATE,
                      id,
                      "CENTRAL_RISK_UPDATE"));
              return completed(
                  context, saved, RevisionOperationType.UPDATE, expectedVersion, before);
            });
    return support.aggregateResponse(result, finalized.get());
  }

  public MasterDataRevisionMutationResponse move(UUID id, MoveCentralRiskTemplateRequest request) {
    long expectedVersion = support.requireVersion(request.version());
    int sortOrder = support.normalizeSortOrder(request.sortOrder());
    RevisionExecutionResult result =
        revisions.executeStructural(
            MasterDataHierarchyKey.RISK,
            RevisionRequest.central(
                "Move risk template " + id, "Risk Template category move", null),
            context -> {
              requireGuard(context);
              Map<UUID, CentralRiskCategoryEntity> categories = categories();
              requireCategory(request.riskCategoryId(), categories);
              CentralRiskTemplateEntity entity = lock(id);
              support.assertVersion(entity, expectedVersion);
              entity.requireNotDeleted();
              if (entity.getRiskCategoryId().equals(request.riskCategoryId())
                  && entity.getSortOrder() == sortOrder) throw invalidHierarchyMove();
              JsonNode before = snapshot(entity);
              entity.move(
                  request.riskCategoryId(), sortOrder, actors.currentActorId(), Instant.now(clock));
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
                operationType + " risk template " + id, "Risk Template lifecycle", null),
            context -> {
              requireGuard(context);
              Map<UUID, CentralRiskCategoryEntity> categories = categories();
              CentralRiskTemplateEntity entity = lock(id);
              support.assertVersion(entity, expectedVersion);
              support.validateLifecycle(entity, operationType);
              if (operationType == RevisionOperationType.DELETE
                  && dependencyChecker.centralRiskTemplateHasApprovedDependencies(id)) {
                throw new com.digiaudit.grcpc.common.exception.ConflictException(
                    "DEPENDENCY_EXISTS",
                    "error.masterdata.v2.dependencyExists",
                    "Risk Template has approved scope dependencies",
                    id);
              }
              if (operationType == RevisionOperationType.ACTIVATE
                  || operationType == RevisionOperationType.RESTORE) {
                requireCategory(entity.getRiskCategoryId(), categories);
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

  private Map<UUID, CentralRiskCategoryEntity> categories() {
    return categoryRepository.findAllByOrderByIdAsc().stream()
        .collect(Collectors.toMap(CentralRiskCategoryEntity::getId, Function.identity()));
  }

  private void requireCategory(UUID id, Map<UUID, CentralRiskCategoryEntity> categories) {
    hierarchySupport.requireParent(UUID.randomUUID(), id, categories, "Risk Category");
  }

  private void requireGuard(RevisionExecutionContext context) {
    mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.RISK);
  }

  private CentralRiskTemplateEntity lock(UUID id) {
    return repository.lockById(id).orElseThrow(() -> notFound(id));
  }

  private NotFoundException notFound(UUID id) {
    return new NotFoundException(
        "MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound", "Risk Template not found", id);
  }

  private UnprocessableEntityException parentMismatch() {
    return new UnprocessableEntityException(
        "INVALID_PARENT",
        "error.masterdata.v2.invalidParent",
        "Create cannot change the stored category");
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

  private Map<String, ?> typed(CentralRiskTemplateEntity e) {
    return Map.of("riskCategoryId", e.getRiskCategoryId(), "sortOrder", e.getSortOrder());
  }

  private JsonNode snapshot(CentralRiskTemplateEntity e) {
    return support.snapshot(e, typed(e));
  }

  private RevisionOperationResult completed(
      RevisionExecutionContext c,
      CentralRiskTemplateEntity e,
      RevisionOperationType o,
      Long v,
      JsonNode b) {
    return support.completed(c, e, RevisionEntityType.CENTRAL_RISK_TEMPLATE, o, v, b, typed(e));
  }

  private boolean same(
      CentralRiskTemplateEntity e, String t, String d, UpdateCentralRiskTemplateRequest r) {
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
