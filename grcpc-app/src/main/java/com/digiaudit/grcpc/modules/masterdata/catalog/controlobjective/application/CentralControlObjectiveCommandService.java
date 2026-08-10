package com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.api.dto.CreateCentralControlObjectiveRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.api.dto.UpdateCentralControlObjectiveRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.repository.CentralControlObjectiveRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionActorProvider;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionCoordinator;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionResult;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionOperationResult;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionRequest;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataAggregateMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataStructuralDependencyChecker;
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
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class CentralControlObjectiveCommandService {
  private final CentralControlObjectiveRepository repository;
  private final MasterDataRevisionCoordinator revisionCoordinator;
  private final MasterDataRevisionActorProvider actorProvider;
  private final DocumentCommandService documentCommandService;
  private final CatalogCommandSupport support;
  private final MasterDataStructuralDependencyChecker dependencyChecker;
  private final Clock clock;

  public CentralControlObjectiveCommandService(
      CentralControlObjectiveRepository repository,
      MasterDataRevisionCoordinator revisionCoordinator,
      MasterDataRevisionActorProvider actorProvider,
      DocumentCommandService documentCommandService,
      CatalogCommandSupport support,
      MasterDataStructuralDependencyChecker dependencyChecker,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.repository = repository;
    this.revisionCoordinator = revisionCoordinator;
    this.actorProvider = actorProvider;
    this.documentCommandService = documentCommandService;
    this.support = support;
    this.dependencyChecker = dependencyChecker;
    this.clock = clock;
  }

  public MasterDataAggregateMutationResponse create(CreateCentralControlObjectiveRequest request) {
    String code = support.normalizeCode(request.code());
    String title = support.normalizeTitle(request.title());
    String description = support.normalizeDescription(request.description());
    String objectiveClass = normalizeObjectiveClass(request.objectiveClass());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<List<DocumentCommandResponse>> documents = new AtomicReference<>(List.of());

    try {
      RevisionExecutionResult result =
          revisionCoordinator.execute(
              RevisionRequest.central(
                  "Create central control objective " + code,
                  "Central Control Objective create",
                  null),
              context -> {
                DocumentCommandService.PreparedAggregateContext prepared =
                    documentCommandService.prepareAggregate(request.documents());
                CentralControlObjectiveEntity entity = repository.findByCode(code).orElse(null);
                RevisionOperationType operationType;
                Long expectedVersion;
                JsonNode before;
                UUID actorId = actorProvider.currentActorId();
                Instant now = Instant.now(clock);

                if (entity == null) {
                  entity =
                      CentralControlObjectiveEntity.create(
                          UUID.randomUUID(),
                          code,
                          title,
                          description,
                          objectiveClass,
                          request.validFrom(),
                          request.validTo(),
                          actorId,
                          now);
                  operationType = RevisionOperationType.CREATE;
                  expectedVersion = null;
                  before = null;
                } else {
                  if (entity.getStatus() == MasterDataLifecycleStatus.ACTIVE) {
                    throw support.duplicate(code);
                  }
                  before = snapshot(entity);
                  expectedVersion = entity.getVersion();
                  if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) {
                    entity.restoreFromCreate(
                        title,
                        description,
                        objectiveClass,
                        request.validFrom(),
                        request.validTo(),
                        actorId,
                        now);
                    operationType = RevisionOperationType.RESTORE;
                  } else {
                    entity.reactivateFromCreate(
                        title,
                        description,
                        objectiveClass,
                        request.validFrom(),
                        request.validTo(),
                        actorId,
                        now);
                    operationType = RevisionOperationType.ACTIVATE;
                  }
                }

                CentralControlObjectiveEntity saved = repository.saveAndFlush(entity);
                documents.set(
                    documentCommandService.finalizePreparedAggregate(
                        prepared,
                        DocumentLinkTargetType.CENTRAL_CONTROL_OBJECTIVE,
                        saved.getId(),
                        "CENTRAL_CONTROL_OBJECTIVE_CREATE"));
                return completed(context, saved, operationType, expectedVersion, before);
              });
      return support.aggregateResponse(result, documents.get());
    } catch (DataIntegrityViolationException exception) {
      throw support.translateBusinessKeyViolation(
          exception, "UK_CENTRAL_CONTROL_OBJECTIVE_CODE", code);
    }
  }

  public MasterDataAggregateMutationResponse update(
      UUID id, UpdateCentralControlObjectiveRequest request) {
    long expectedVersion = support.requireVersion(request.version());
    String title = support.normalizeTitle(request.title());
    String description = support.normalizeDescription(request.description());
    String objectiveClass = normalizeObjectiveClass(request.objectiveClass());
    MasterDataLifecycleStatus requestedStatus = requireEditableStatus(request.status());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<List<DocumentCommandResponse>> documents = new AtomicReference<>(List.of());

    RevisionExecutionResult result =
        revisionCoordinator.execute(
            RevisionRequest.central(
                "Update central control objective " + id,
                "Central Control Objective update",
                null),
            context -> {
              DocumentCommandService.PreparedAggregateContext prepared =
                  documentCommandService.prepareAggregate(request.documents());
              CentralControlObjectiveEntity entity = lock(id);
              support.assertVersion(entity, expectedVersion);
              if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) {
                throw notFound(id);
              }
              if (sameDefinition(
                      entity, title, description, objectiveClass, requestedStatus, request)
                  && isEmpty(request.documents())) {
                throw new UnprocessableEntityException(
                    "NO_CHANGE", "error.masterdata.v2.noChange", "The command contains no change");
              }

              JsonNode before = snapshot(entity);
              UUID actorId = actorProvider.currentActorId();
              Instant now = Instant.now(clock);
              entity.update(
                  title,
                  description,
                  objectiveClass,
                  request.validFrom(),
                  request.validTo(),
                  actorId,
                  now);
              if (entity.getStatus() != requestedStatus) {
                if (requestedStatus == MasterDataLifecycleStatus.ACTIVE) {
                  entity.activate(actorId, now);
                } else {
                  entity.inactivate(actorId, now);
                }
              }

              CentralControlObjectiveEntity saved = repository.saveAndFlush(entity);
              documents.set(
                  documentCommandService.finalizePreparedAggregate(
                      prepared,
                      DocumentLinkTargetType.CENTRAL_CONTROL_OBJECTIVE,
                      saved.getId(),
                      "CENTRAL_CONTROL_OBJECTIVE_UPDATE"));
              return completed(
                  context, saved, RevisionOperationType.UPDATE, expectedVersion, before);
            });
    return support.aggregateResponse(result, documents.get());
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
      UUID id, Long requestedVersion, RevisionOperationType operationType) {
    long expectedVersion = support.requireVersion(requestedVersion);
    RevisionExecutionResult result =
        revisionCoordinator.execute(
            RevisionRequest.central(
                operationType + " central control objective " + id,
                "Central Control Objective lifecycle",
                null),
            context -> {
              CentralControlObjectiveEntity entity = lock(id);
              support.assertVersion(entity, expectedVersion);
              support.validateLifecycle(entity, operationType);
              if (operationType == RevisionOperationType.DELETE
                  && dependencyChecker.centralControlObjectiveHasApprovedDependencies(id)) {
                throw new ConflictException(
                    "DEPENDENCY_EXISTS",
                    "error.masterdata.v2.dependencyExists",
                    "Control Objective has approved structural dependencies",
                    id);
              }
              JsonNode before = snapshot(entity);
              UUID actorId = actorProvider.currentActorId();
              Instant now = Instant.now(clock);
              switch (operationType) {
                case ACTIVATE -> entity.activate(actorId, now);
                case INACTIVATE -> entity.inactivate(actorId, now);
                case DELETE -> entity.delete(actorId, now);
                case RESTORE -> entity.restore(actorId, now);
                default -> throw new IllegalArgumentException("Unsupported lifecycle operation");
              }
              return completed(
                  context, repository.saveAndFlush(entity), operationType, expectedVersion, before);
            });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  private RevisionOperationResult completed(
      RevisionExecutionContext context,
      CentralControlObjectiveEntity entity,
      RevisionOperationType operationType,
      Long expectedVersion,
      JsonNode before) {
    return support.completed(
        context,
        entity,
        RevisionEntityType.CENTRAL_CONTROL_OBJECTIVE,
        operationType,
        expectedVersion,
        before,
        typedFields(entity));
  }

  private JsonNode snapshot(CentralControlObjectiveEntity entity) {
    return support.snapshot(entity, typedFields(entity));
  }

  private Map<String, Object> typedFields(CentralControlObjectiveEntity entity) {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("objectiveClass", entity.getObjectiveClass());
    return fields;
  }

  private CentralControlObjectiveEntity lock(UUID id) {
    return repository.lockById(id).orElseThrow(() -> notFound(id));
  }

  private NotFoundException notFound(UUID id) {
    return new NotFoundException(
        "MASTER_DATA_NOT_FOUND",
        "error.masterdata.v2.notFound",
        "Control Objective not found",
        id);
  }

  private String normalizeObjectiveClass(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    String normalized = value.trim();
    if (normalized.length() > 255) {
      throw new UnprocessableEntityException(
          "INVALID_OBJECTIVE_CLASS",
          "error.masterdata.v2.invalidObjectiveClass",
          "Control Objective class exceeds 255 characters");
    }
    return normalized;
  }

  private MasterDataLifecycleStatus requireEditableStatus(MasterDataLifecycleStatus status) {
    if (status == null || status == MasterDataLifecycleStatus.DELETED) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_TRANSITION",
          "error.masterdata.v2.invalidLifecycleTransition",
          "Control Objective edit status must be ACTIVE or INACTIVE");
    }
    return status;
  }

  private boolean sameDefinition(
      CentralControlObjectiveEntity entity,
      String title,
      String description,
      String objectiveClass,
      MasterDataLifecycleStatus requestedStatus,
      UpdateCentralControlObjectiveRequest request) {
    return Objects.equals(entity.getTitle(), title)
        && Objects.equals(entity.getDescription(), description)
        && Objects.equals(entity.getObjectiveClass(), objectiveClass)
        && entity.getStatus() == requestedStatus
        && Objects.equals(entity.getValidFrom(), request.validFrom())
        && Objects.equals(entity.getValidTo(), request.validTo());
  }

  private boolean isEmpty(DocumentAggregateBatchRequest request) {
    return request == null
        || (request.newDocuments().isEmpty()
            && request.newVersions().isEmpty()
            && request.metadataUpdates().isEmpty());
  }
}
