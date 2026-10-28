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
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto.CentralControlObjectiveAccountGroupResponse;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto.CentralControlObjectiveAggregateMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.application.CentralControlObjectiveAccountGroupAggregateService;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionActorProvider;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionCoordinator;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionResult;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionOperationResult;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionOperation;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionRequest;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataStructuralDependencyChecker;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.application.CentralRiskControlObjectiveAssignmentAggregateService;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api.dto.CentralRiskControlObjectiveAssignmentChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api.dto.CentralRiskControlObjectiveAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.api.dto.CentralControlObjectiveResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.api.mapper.CentralControlObjectiveMapper;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.ArrayList;
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
  private final CentralControlObjectiveAccountGroupAggregateService accountGroupClassifications;
  private final CentralRiskControlObjectiveAssignmentAggregateService riskAssignments;
  private final Clock clock;
  private final CentralControlObjectiveMapper mapper;

  public CentralControlObjectiveCommandService(
      CentralControlObjectiveRepository repository,
      MasterDataRevisionCoordinator revisionCoordinator,
      MasterDataRevisionActorProvider actorProvider,
      DocumentCommandService documentCommandService,
      CatalogCommandSupport support,
      MasterDataStructuralDependencyChecker dependencyChecker,
      CentralControlObjectiveAccountGroupAggregateService accountGroupClassifications,
      CentralRiskControlObjectiveAssignmentAggregateService riskAssignments,
      @Qualifier("masterDataRevisionClock") Clock clock, CentralControlObjectiveMapper mapper) {
    this.repository = repository;
    this.revisionCoordinator = revisionCoordinator;
    this.actorProvider = actorProvider;
    this.documentCommandService = documentCommandService;
    this.support = support;
    this.dependencyChecker = dependencyChecker;
    this.accountGroupClassifications = accountGroupClassifications;
    this.riskAssignments = riskAssignments;
    this.clock = clock;
    this.mapper = mapper;
  }

  public CentralControlObjectiveAggregateMutationResponse create(
      CreateCentralControlObjectiveRequest request) {
    String code = support.normalizeCode(request.code());
    String title = support.normalizeTitle(request.title());
    String description = support.normalizeDescription(request.description());
    String objectiveClass = normalizeObjectiveClass(request.objectiveClass());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<CentralControlObjectiveResponse> canonicalEntity = new AtomicReference<>();
    AtomicReference<List<DocumentCommandResponse>> documents = new AtomicReference<>(List.of());
    AtomicReference<List<CentralRiskControlObjectiveAssignmentResponse>> canonicalRiskAssignments = new AtomicReference<>(List.of());
    AtomicReference<List<CentralControlObjectiveAccountGroupResponse>> canonicalClassifications =
        new AtomicReference<>(List.of());

    try {
      RevisionRequest revisionRequest = RevisionRequest.central(
          "Create central control objective " + code,
          "Central Control Objective create",
          null);
      RevisionOperation operation = context -> {
                DocumentCommandService.PreparedAggregateContext prepared =
                    documentCommandService.prepareAggregate(request.documents());
                riskAssignments.lockEndpoints(context, request.riskAssignments());
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

                CentralControlObjectiveAccountGroupAggregateService.PreparedChanges
                    preparedClassifications = accountGroupClassifications.prepare(
                        context, entity, MasterDataLifecycleStatus.ACTIVE,
                        request.accountGroupChanges());
                CentralRiskControlObjectiveAssignmentAggregateService.PreparedChanges preparedRiskAssignments =
                    riskAssignments.prepare(context, entity, MasterDataLifecycleStatus.ACTIVE, request.riskAssignments());
                CentralControlObjectiveEntity saved = repository.saveAndFlush(entity);
                canonicalEntity.set(mapper.toResponse(saved));
                documents.set(
                    documentCommandService.finalizePreparedAggregate(
                        prepared,
                        DocumentLinkTargetType.CENTRAL_CONTROL_OBJECTIVE,
                        saved.getId(),
                        "MD_CONTROL_MANAGE"));
                CentralControlObjectiveAccountGroupAggregateService.ApplyResult
                    classificationResult = accountGroupClassifications.apply(
                        preparedClassifications, saved);
                canonicalClassifications.set(classificationResult.canonicalRows());
                CentralRiskControlObjectiveAssignmentAggregateService.ApplyResult riskAssignmentsResult = riskAssignments.apply(preparedRiskAssignments, saved);
                canonicalRiskAssignments.set(riskAssignmentsResult.canonicalRows());
                return combine(
                    context,
                    completed(context, saved, operationType, expectedVersion, before),
                    classificationResult.revisionContents(), riskAssignmentsResult.revisionContents());
              };
      RevisionExecutionResult result = requiredGuards(request.accountGroupChanges(), request.riskAssignments()).isEmpty()
          ? revisionCoordinator.execute(revisionRequest, operation)
          : revisionCoordinator.executeStructural(
              requiredGuards(request.accountGroupChanges(), request.riskAssignments()), revisionRequest, operation);
      return aggregateResponse(result, documents.get(), canonicalClassifications.get(), canonicalRiskAssignments.get(), canonicalEntity.get());
    } catch (DataIntegrityViolationException exception) {
      throw support.translateBusinessKeyViolation(
          exception, "UK_CENTRAL_CONTROL_OBJECTIVE_CODE", code);
    }
  }

  public CentralControlObjectiveAggregateMutationResponse update(
      UUID id, UpdateCentralControlObjectiveRequest request) {
    long expectedVersion = support.requireVersion(request.version());
    String title = support.normalizeTitle(request.title());
    String description = support.normalizeDescription(request.description());
    String objectiveClass = normalizeObjectiveClass(request.objectiveClass());
    MasterDataLifecycleStatus requestedStatus = requireEditableStatus(request.status());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<CentralControlObjectiveResponse> canonicalEntity = new AtomicReference<>();
    AtomicReference<List<DocumentCommandResponse>> documents = new AtomicReference<>(List.of());
    AtomicReference<List<CentralRiskControlObjectiveAssignmentResponse>> canonicalRiskAssignments = new AtomicReference<>(List.of());
    AtomicReference<List<CentralControlObjectiveAccountGroupResponse>> canonicalClassifications =
        new AtomicReference<>(List.of());

    RevisionRequest revisionRequest = RevisionRequest.central(
        "Update central control objective " + id,
        "Central Control Objective update",
        null);
    RevisionOperation operation = context -> {
              DocumentCommandService.PreparedAggregateContext prepared =
                  documentCommandService.prepareAggregate(request.documents());
              riskAssignments.lockEndpoints(context, request.riskAssignments());
              CentralControlObjectiveEntity entity = lock(id);
              support.assertVersion(entity, expectedVersion);
              if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) {
                throw notFound(id);
              }
              JsonNode before = snapshot(entity);
              CentralControlObjectiveAccountGroupAggregateService.PreparedChanges
                  preparedClassifications = accountGroupClassifications.prepare(
                      context, entity, requestedStatus, request.accountGroupChanges());
              CentralRiskControlObjectiveAssignmentAggregateService.PreparedChanges preparedRiskAssignments =
                  riskAssignments.prepare(context, entity, requestedStatus, request.riskAssignments());
              if (sameDefinition(
                      entity, title, description, objectiveClass, requestedStatus, request)
                  && isEmpty(request.documents()) && isEmpty(request.accountGroupChanges()) && !preparedRiskAssignments.changed()) {
                throw new UnprocessableEntityException(
                    "NO_CHANGE", "error.masterdata.v2.noChange", "The command contains no change");
              }

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
                canonicalEntity.set(mapper.toResponse(saved));
              documents.set(
                  documentCommandService.finalizePreparedAggregate(
                      prepared,
                      DocumentLinkTargetType.CENTRAL_CONTROL_OBJECTIVE,
                      saved.getId(),
                      "MD_CONTROL_MANAGE"));
              CentralControlObjectiveAccountGroupAggregateService.ApplyResult
                  classificationResult = accountGroupClassifications.apply(
                      preparedClassifications, saved);
              canonicalClassifications.set(classificationResult.canonicalRows());
              CentralRiskControlObjectiveAssignmentAggregateService.ApplyResult riskAssignmentsResult = riskAssignments.apply(preparedRiskAssignments, saved);
              canonicalRiskAssignments.set(riskAssignmentsResult.canonicalRows());
              return combine(
                  context,
                  completed(context, saved, RevisionOperationType.UPDATE, expectedVersion, before),
                  classificationResult.revisionContents(), riskAssignmentsResult.revisionContents());
            };
    RevisionExecutionResult result = requiredGuards(request.accountGroupChanges(), request.riskAssignments()).isEmpty()
        ? revisionCoordinator.execute(revisionRequest, operation)
        : revisionCoordinator.executeStructural(
            requiredGuards(request.accountGroupChanges(), request.riskAssignments()), revisionRequest, operation);
    return aggregateResponse(result, documents.get(), canonicalClassifications.get(), canonicalRiskAssignments.get(), canonicalEntity.get());
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
        revisionCoordinator.executeStructural(
            List.of(MasterDataHierarchyKey.ACCOUNT_GROUP, MasterDataHierarchyKey.CONTROL, MasterDataHierarchyKey.RISK),
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

  private List<MasterDataHierarchyKey> requiredGuards(List<?> classifications, List<CentralRiskControlObjectiveAssignmentChangeRequest> riskAssignments) {
    var keys = new java.util.TreeSet<MasterDataHierarchyKey>(java.util.Comparator.comparing(Enum::name));
    if (!isEmpty(classifications)) keys.add(MasterDataHierarchyKey.ACCOUNT_GROUP);
    if (!isEmpty(riskAssignments)) keys.addAll(List.of(MasterDataHierarchyKey.RISK));
    return List.copyOf(keys);
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

  @SafeVarargs
  private final RevisionOperationResult combine(RevisionExecutionContext context, RevisionOperationResult primary,
      List<com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult>... relationContents) {
    var contents = new ArrayList<>(primary.contentResults());
    for (var relations : relationContents) contents.addAll(relations);
    return RevisionOperationResult.completed(context, primary.primaryResult(), contents);
  }

  private CentralControlObjectiveAggregateMutationResponse aggregateResponse(
      RevisionExecutionResult result,
      List<DocumentCommandResponse> documents,
      List<CentralControlObjectiveAccountGroupResponse> classifications,
      List<CentralRiskControlObjectiveAssignmentResponse> riskAssignments, CentralControlObjectiveResponse entity) {
    var primary = result.primaryResult();
    return new CentralControlObjectiveAggregateMutationResponse(
        primary.entityId(), primary.revisionId(), primary.version(), documents, classifications, riskAssignments, entity);
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

  private boolean isEmpty(List<?> values) {
    return values == null || values.isEmpty();
  }
}
