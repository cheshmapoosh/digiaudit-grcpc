package com.digiaudit.grcpc.modules.masterdata.catalog.control.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CreateCentralControlRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.UpdateCentralControlRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlTriggerType;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
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
public class CentralControlCommandService {
  private final CentralControlRepository repository;
  private final CentralControlGroupRepository groups;
  private final MasterDataRevisionCoordinator revisionCoordinator;
  private final MasterDataRevisionActorProvider actorProvider;
  private final DocumentCommandService documentCommandService;
  private final CatalogCommandSupport support;
  private final MasterDataStructuralDependencyChecker dependencyChecker;
  private final Clock clock;

  public CentralControlCommandService(
      CentralControlRepository repository,
      CentralControlGroupRepository groups,
      MasterDataRevisionCoordinator revisionCoordinator,
      MasterDataRevisionActorProvider actorProvider,
      DocumentCommandService documentCommandService,
      CatalogCommandSupport support,
      MasterDataStructuralDependencyChecker dependencyChecker,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.repository = repository;
    this.groups = groups;
    this.revisionCoordinator = revisionCoordinator;
    this.actorProvider = actorProvider;
    this.documentCommandService = documentCommandService;
    this.support = support;
    this.dependencyChecker = dependencyChecker;
    this.clock = clock;
  }

  public MasterDataAggregateMutationResponse create(CreateCentralControlRequest request) {
    String code = support.normalizeCode(request.code());
    String title = support.normalizeTitle(request.title());
    String description = support.normalizeDescription(request.description());
    String eventDescription = support.normalizeDescription(request.eventDescription());
    validate(
        request.controlGroupId(),
        request.triggerType(),
        eventDescription,
        request.operationFrequency());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<List<DocumentCommandResponse>> documents = new AtomicReference<>(List.of());

    try {
      RevisionExecutionResult result =
          revisionCoordinator.execute(
              RevisionRequest.central(
                  "Create central control " + code, "Central Control definition create", null),
              context -> {
                DocumentCommandService.PreparedAggregateContext prepared =
                    documentCommandService.prepareAggregate(request.documents());
                CentralControlEntity entity = repository.findByCode(code).orElse(null);
                RevisionOperationType operationType;
                Long expectedVersion;
                JsonNode before;
                UUID actorId = actorProvider.currentActorId();
                Instant now = Instant.now(clock);

                if (entity == null) {
                  entity =
                      CentralControlEntity.create(
                          UUID.randomUUID(),
                          code,
                          title,
                          description,
                          request.controlGroupId(),
                          request.controlClass(),
                          request.importance(),
                          request.controlRisk(),
                          request.automationType(),
                          request.controlPurpose(),
                          request.nature(),
                          request.controlRelevance(),
                          request.triggerType(),
                          eventDescription,
                          request.operationFrequency(),
                          request.toBeTested(),
                          request.testAutomationType(),
                          request.testingTechnique(),
                          request.evidenceLevel(),
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
                        request.controlGroupId(),
                        request.controlClass(),
                        request.importance(),
                        request.controlRisk(),
                        request.automationType(),
                        request.controlPurpose(),
                        request.nature(),
                        request.controlRelevance(),
                        request.triggerType(),
                        eventDescription,
                        request.operationFrequency(),
                        request.toBeTested(),
                        request.testAutomationType(),
                        request.testingTechnique(),
                        request.evidenceLevel(),
                        request.validFrom(),
                        request.validTo(),
                        actorId,
                        now);
                    operationType = RevisionOperationType.RESTORE;
                  } else {
                    entity.reactivateFromCreate(
                        title,
                        description,
                        request.controlGroupId(),
                        request.controlClass(),
                        request.importance(),
                        request.controlRisk(),
                        request.automationType(),
                        request.controlPurpose(),
                        request.nature(),
                        request.controlRelevance(),
                        request.triggerType(),
                        eventDescription,
                        request.operationFrequency(),
                        request.toBeTested(),
                        request.testAutomationType(),
                        request.testingTechnique(),
                        request.evidenceLevel(),
                        request.validFrom(),
                        request.validTo(),
                        actorId,
                        now);
                    operationType = RevisionOperationType.ACTIVATE;
                  }
                }

                CentralControlEntity saved = repository.saveAndFlush(entity);
                documents.set(
                    documentCommandService.finalizePreparedAggregate(
                        prepared,
                        DocumentLinkTargetType.CENTRAL_CONTROL,
                        saved.getId(),
                        "CENTRAL_CONTROL_CREATE"));
                return completed(context, saved, operationType, expectedVersion, before);
              });
      return support.aggregateResponse(result, documents.get());
    } catch (DataIntegrityViolationException exception) {
      throw support.translateBusinessKeyViolation(exception, "UK_CENTRAL_CONTROL_CODE", code);
    }
  }

  public MasterDataAggregateMutationResponse update(UUID id, UpdateCentralControlRequest request) {
    long expectedVersion = support.requireVersion(request.version());
    String title = support.normalizeTitle(request.title());
    String description = support.normalizeDescription(request.description());
    String eventDescription = support.normalizeDescription(request.eventDescription());
    MasterDataLifecycleStatus requestedStatus = requireEditableStatus(request.status());
    validate(
        request.controlGroupId(),
        request.triggerType(),
        eventDescription,
        request.operationFrequency());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<List<DocumentCommandResponse>> documents = new AtomicReference<>(List.of());

    RevisionExecutionResult result =
        revisionCoordinator.execute(
            RevisionRequest.central(
                "Update central control " + id, "Central Control definition update", null),
            context -> {
              DocumentCommandService.PreparedAggregateContext prepared =
                  documentCommandService.prepareAggregate(request.documents());
              CentralControlEntity entity = lock(id);
              support.assertVersion(entity, expectedVersion);
              if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
              if (sameDefinition(entity, title, description, eventDescription, requestedStatus, request)
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
                  request.controlGroupId(),
                  request.controlClass(),
                  request.importance(),
                  request.controlRisk(),
                  request.automationType(),
                  request.controlPurpose(),
                  request.nature(),
                  request.controlRelevance(),
                  request.triggerType(),
                  eventDescription,
                  request.operationFrequency(),
                  request.toBeTested(),
                  request.testAutomationType(),
                  request.testingTechnique(),
                  request.evidenceLevel(),
                  request.validFrom(),
                  request.validTo(),
                  actorId,
                  now);
              if (entity.getStatus() != requestedStatus) {
                if (requestedStatus == MasterDataLifecycleStatus.ACTIVE) entity.activate(actorId, now);
                else entity.inactivate(actorId, now);
              }
              CentralControlEntity saved = repository.saveAndFlush(entity);
              documents.set(
                  documentCommandService.finalizePreparedAggregate(
                      prepared,
                      DocumentLinkTargetType.CENTRAL_CONTROL,
                      saved.getId(),
                      "CENTRAL_CONTROL_UPDATE"));
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
                operationType + " central control " + id,
                "Central Control lifecycle command",
                null),
            context -> {
              CentralControlEntity entity = lock(id);
              support.assertVersion(entity, expectedVersion);
              support.validateLifecycle(entity, operationType);
              if (operationType == RevisionOperationType.DELETE
                  && dependencyChecker.centralControlHasApprovedDependencies(id)) {
                throw new ConflictException(
                    "DEPENDENCY_EXISTS",
                    "error.masterdata.v2.dependencyExists",
                    "Control has approved structural dependencies",
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

  private void validate(
      UUID controlGroupId,
      CentralControlTriggerType triggerType,
      String eventDescription,
      Object operationFrequency) {
    if (controlGroupId != null
        && groups.findByIdAndStatusNot(controlGroupId, MasterDataLifecycleStatus.DELETED).isEmpty()) {
      throw new UnprocessableEntityException(
          "INVALID_PARENT",
          "error.masterdata.v2.invalidParent",
          "Control Group does not exist or is deleted");
    }
    if (eventDescription != null && triggerType != CentralControlTriggerType.EVENT) {
      throw new UnprocessableEntityException(
          "INVALID_CONTROL_EVENT_DESCRIPTION",
          "error.masterdata.v2.invalidControlEventDescription",
          "Event description is only valid for EVENT trigger");
    }
    if (operationFrequency != null && triggerType != CentralControlTriggerType.DATE) {
      throw new UnprocessableEntityException(
          "INVALID_CONTROL_FREQUENCY",
          "error.masterdata.v2.invalidControlFrequency",
          "Operation frequency is only valid for DATE trigger");
    }
  }

  private RevisionOperationResult completed(
      RevisionExecutionContext context,
      CentralControlEntity entity,
      RevisionOperationType operationType,
      Long expectedVersion,
      JsonNode before) {
    return support.completed(
        context,
        entity,
        RevisionEntityType.CENTRAL_CONTROL,
        operationType,
        expectedVersion,
        before,
        typedFields(entity));
  }

  private JsonNode snapshot(CentralControlEntity entity) {
    return support.snapshot(entity, typedFields(entity));
  }

  private Map<String, Object> typedFields(CentralControlEntity entity) {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("controlGroupId", entity.getControlGroupId());
    fields.put("controlClass", entity.getControlClass());
    fields.put("importance", entity.getImportance());
    fields.put("controlRisk", entity.getControlRisk());
    fields.put("automationType", entity.getAutomationType());
    fields.put("controlPurpose", entity.getControlPurpose());
    fields.put("nature", entity.getNature());
    fields.put("controlRelevance", entity.getControlRelevance());
    fields.put("triggerType", entity.getTriggerType());
    fields.put("eventDescription", entity.getEventDescription());
    fields.put("operationFrequency", entity.getOperationFrequency());
    fields.put("toBeTested", entity.getToBeTested());
    fields.put("testAutomationType", entity.getTestAutomationType());
    fields.put("testingTechnique", entity.getTestingTechnique());
    fields.put("evidenceLevel", entity.getEvidenceLevel());
    return fields;
  }

  private CentralControlEntity lock(UUID id) {
    return repository.lockById(id).orElseThrow(() -> notFound(id));
  }

  private NotFoundException notFound(UUID id) {
    return new NotFoundException(
        "MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound", "Control not found", id);
  }

  private MasterDataLifecycleStatus requireEditableStatus(MasterDataLifecycleStatus status) {
    if (status == null || status == MasterDataLifecycleStatus.DELETED) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_TRANSITION",
          "error.masterdata.v2.invalidLifecycleTransition",
          "Control edit status must be ACTIVE or INACTIVE");
    }
    return status;
  }

  private boolean sameDefinition(
      CentralControlEntity entity,
      String title,
      String description,
      String eventDescription,
      MasterDataLifecycleStatus requestedStatus,
      UpdateCentralControlRequest request) {
    return Objects.equals(entity.getTitle(), title)
        && Objects.equals(entity.getDescription(), description)
        && Objects.equals(entity.getControlGroupId(), request.controlGroupId())
        && Objects.equals(entity.getControlClass(), request.controlClass())
        && Objects.equals(entity.getImportance(), request.importance())
        && Objects.equals(entity.getControlRisk(), request.controlRisk())
        && Objects.equals(entity.getAutomationType(), request.automationType())
        && Objects.equals(entity.getControlPurpose(), request.controlPurpose())
        && Objects.equals(entity.getNature(), request.nature())
        && Objects.equals(
            entity.getControlRelevance(),
            request.controlRelevance() == null ? java.util.Set.of() : request.controlRelevance())
        && Objects.equals(entity.getTriggerType(), request.triggerType())
        && Objects.equals(entity.getEventDescription(), eventDescription)
        && Objects.equals(entity.getOperationFrequency(), request.operationFrequency())
        && Objects.equals(entity.getToBeTested(), request.toBeTested())
        && Objects.equals(entity.getTestAutomationType(), request.testAutomationType())
        && Objects.equals(entity.getTestingTechnique(), request.testingTechnique())
        && Objects.equals(entity.getEvidenceLevel(), request.evidenceLevel())
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
