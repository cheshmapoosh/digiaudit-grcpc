package com.digiaudit.grcpc.modules.masterdata.catalog.policy.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentAggregateBatchRequest;
import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.PolicyVersionStatus;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyVersionEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository.CentralPolicyRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository.CentralPolicyVersionRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionActorProvider;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionCoordinator;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionMutationGuard;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionOperationResult;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionRequest;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataAggregateMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataStructuralDependencyChecker;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
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
public class CentralPolicyVersionCommandService {
  private static final String VERSION_NUMBER_CONSTRAINT = "UK_CENTRAL_POLICY_VERSION_NO";

  private final CentralPolicyVersionRepository repository;
  private final CentralPolicyRepository policies;
  private final MasterDataRevisionCoordinator revisions;
  private final MasterDataRevisionActorProvider actors;
  private final RevisionMutationGuard guard;
  private final DocumentCommandService documents;
  private final CatalogCommandSupport support;
  private final MasterDataStructuralDependencyChecker dependencyChecker;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public CentralPolicyVersionCommandService(
      CentralPolicyVersionRepository repository,
      CentralPolicyRepository policies,
      MasterDataRevisionCoordinator revisions,
      MasterDataRevisionActorProvider actors,
      RevisionMutationGuard guard,
      DocumentCommandService documents,
      CatalogCommandSupport support,
      MasterDataStructuralDependencyChecker dependencyChecker,
      ObjectMapper objectMapper,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.repository = repository;
    this.policies = policies;
    this.revisions = revisions;
    this.actors = actors;
    this.guard = guard;
    this.documents = documents;
    this.support = support;
    this.dependencyChecker = dependencyChecker;
    this.objectMapper = objectMapper;
    this.clock = clock;
  }

  public MasterDataAggregateMutationResponse create(
      UUID policyId, CentralPolicyDtos.CreateVersion request) {
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<List<DocumentCommandResponse>> finalizedDocuments =
        new AtomicReference<>(List.of());
    try {
      var result =
          revisions.executeStructural(
              MasterDataHierarchyKey.POLICY,
              RevisionRequest.central(
                  "Create policy version for " + policyId, "Policy Version draft create", null),
              context -> {
                requirePolicyGuard(context);
                CentralPolicyEntity policy = lockPolicy(policyId);
                requireActivePolicy(policy);
                List<CentralPolicyVersionEntity> lockedVersions =
                    repository.lockAllByPolicyId(policyId);
                int versionNumber = nextVersionNumber(lockedVersions);
                var preparedDocuments = documents.prepareAggregate(request.documents());
                CentralPolicyVersionEntity draft =
                    CentralPolicyVersionEntity.createDraft(
                        UUID.randomUUID(),
                        policyId,
                        versionNumber,
                        normalizeContent(request.content()),
                        request.validFrom(),
                        request.validTo(),
                        actors.currentActorId(),
                        Instant.now(clock));
                CentralPolicyVersionEntity saved = repository.saveAndFlush(draft);
                finalizedDocuments.set(
                    documents.finalizePreparedAggregate(
                        preparedDocuments,
                        DocumentLinkTargetType.CENTRAL_POLICY_VERSION,
                        saved.getId(),
                        "CENTRAL_POLICY_CREATE"));
                return completed(context, saved, RevisionOperationType.CREATE, null, null);
              });
      return support.aggregateResponse(result, finalizedDocuments.get());
    } catch (DataIntegrityViolationException exception) {
      if (support.containsConstraint(exception, VERSION_NUMBER_CONSTRAINT)) {
        throw new ConflictException(
            "POLICY_VERSION_NUMBER_CONFLICT",
            "error.masterdata.v2.policyVersionNumberConflict",
            "Policy Version number allocation conflicted",
            policyId);
      }
      throw exception;
    }
  }

  public MasterDataAggregateMutationResponse update(
      UUID id, CentralPolicyDtos.UpdateVersion request) {
    long expectedVersion = support.requireVersion(request.version());
    support.validateValidity(request.validFrom(), request.validTo());
    AtomicReference<List<DocumentCommandResponse>> finalizedDocuments =
        new AtomicReference<>(List.of());
    var result =
        revisions.executeStructural(
            MasterDataHierarchyKey.POLICY,
            RevisionRequest.central(
                "Update policy version " + id, "Policy Version draft update", null),
            context -> {
              requirePolicyGuard(context);
              CentralPolicyEntity policy = lockPolicyByVersion(id);
              requireActivePolicy(policy);
              List<CentralPolicyVersionEntity> lockedVersions =
                  repository.lockAllByPolicyId(policy.getId());
              CentralPolicyVersionEntity target = requireLockedVersion(lockedVersions, id);
              assertVersion(target, expectedVersion);
              requireActiveDraft(target);
              var preparedDocuments = documents.prepareAggregate(request.documents());
              String content = normalizeContent(request.content());
              if (Objects.equals(target.getContent(), content)
                  && Objects.equals(target.getValidFrom(), request.validFrom())
                  && Objects.equals(target.getValidTo(), request.validTo())
                  && isEmpty(request.documents())) {
                throw new UnprocessableEntityException(
                    "NO_CHANGE", "error.masterdata.v2.noChange", "The command contains no change");
              }
              JsonNode before = snapshot(target);
              target.updateDraft(
                  content,
                  request.validFrom(),
                  request.validTo(),
                  actors.currentActorId(),
                  Instant.now(clock));
              CentralPolicyVersionEntity saved = repository.saveAndFlush(target);
              finalizedDocuments.set(
                  documents.finalizePreparedAggregate(
                      preparedDocuments,
                      DocumentLinkTargetType.CENTRAL_POLICY_VERSION,
                      target.getId(),
                      "CENTRAL_POLICY_UPDATE"));
              return completed(
                  context, saved, RevisionOperationType.UPDATE, expectedVersion, before);
            });
    return support.aggregateResponse(result, finalizedDocuments.get());
  }

  public MasterDataRevisionMutationResponse publish(UUID id, Long version) {
    long expectedVersion = support.requireVersion(version);
    var result =
        revisions.executeStructural(
            MasterDataHierarchyKey.POLICY,
            RevisionRequest.central(
                "Publish policy version " + id,
                "Publish draft and supersede previous publication",
                null),
            context -> {
              requirePolicyGuard(context);
              CentralPolicyEntity policy = lockPolicyByVersion(id);
              requireActivePolicy(policy);
              List<CentralPolicyVersionEntity> lockedVersions =
                  repository.lockAllByPolicyId(policy.getId());
              CentralPolicyVersionEntity target = requireLockedVersion(lockedVersions, id);
              assertVersion(target, expectedVersion);
              requireActiveDraft(target);
              if (target.getContent() == null || target.getContent().isBlank()) {
                throw new UnprocessableEntityException(
                    "INVALID_POLICY_PUBLICATION",
                    "error.masterdata.v2.invalidPolicyPublication",
                    "Policy content is required before publication",
                    id);
              }

              UUID actorId = actors.currentActorId();
              Instant now = Instant.now(clock);
              List<RevisionContentResult> contentResults = new ArrayList<>();
              for (CentralPolicyVersionEntity current : lockedVersions) {
                if (current.getVersionStatus() == PolicyVersionStatus.PUBLISHED) {
                  long previousVersion = current.getVersion();
                  JsonNode before = snapshot(current);
                  current.supersede(actorId, now);
                  contentResults.add(
                      content(current, RevisionOperationType.UPDATE, previousVersion, before));
                }
              }
              JsonNode targetBefore = snapshot(target);
              target.publish(actorId, now);
              repository.saveAllAndFlush(lockedVersions);

              contentResults.replaceAll(
                  resultContent -> refreshAppliedVersion(resultContent, lockedVersions));
              contentResults.add(
                  content(target, RevisionOperationType.UPDATE, expectedVersion, targetBefore));
              return RevisionOperationResult.completed(
                  context,
                  new MasterDataMutationResult(
                      target.getId(), context.revisionId(), target.getVersion()),
                  contentResults);
            });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  public MasterDataRevisionMutationResponse delete(UUID id, Long version) {
    return draftLifecycle(id, version, false);
  }

  public MasterDataRevisionMutationResponse restore(UUID id, Long version) {
    return draftLifecycle(id, version, true);
  }

  private MasterDataRevisionMutationResponse draftLifecycle(
      UUID id, Long version, boolean restore) {
    long expectedVersion = support.requireVersion(version);
    RevisionOperationType operation =
        restore ? RevisionOperationType.RESTORE : RevisionOperationType.DELETE;
    var result =
        revisions.executeStructural(
            MasterDataHierarchyKey.POLICY,
            RevisionRequest.central(
                operation + " policy version " + id, "Policy Version draft lifecycle", null),
            context -> {
              requirePolicyGuard(context);
              CentralPolicyEntity policy = lockPolicyByVersion(id);
              requireActivePolicy(policy);
              List<CentralPolicyVersionEntity> lockedVersions =
                  repository.lockAllByPolicyId(policy.getId());
              CentralPolicyVersionEntity target = requireLockedVersion(lockedVersions, id);
              assertVersion(target, expectedVersion);
              if (restore) {
                requireDeletedDraft(target);
              } else {
                requireActiveDraft(target);
                if (dependencyChecker.centralPolicyVersionHasApprovedDependencies(id)) {
                  throw new ConflictException(
                      "DEPENDENCY_EXISTS",
                      "error.masterdata.v2.dependencyExists",
                      "Policy Version has approved scope dependencies",
                      id);
                }
              }
              JsonNode before = snapshot(target);
              if (restore) {
                target.restoreDraft(actors.currentActorId(), Instant.now(clock));
              } else {
                target.deleteDraft(actors.currentActorId(), Instant.now(clock));
              }
              return completed(
                  context, repository.saveAndFlush(target), operation, expectedVersion, before);
            });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  private int nextVersionNumber(List<CentralPolicyVersionEntity> lockedVersions) {
    return lockedVersions.stream()
            .mapToInt(CentralPolicyVersionEntity::getVersionNumber)
            .max()
            .orElse(0)
        + 1;
  }

  private void requirePolicyGuard(RevisionExecutionContext context) {
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.POLICY);
  }

  private CentralPolicyEntity lockPolicy(UUID policyId) {
    return policies.lockById(policyId).orElseThrow(() -> policyNotFound(policyId));
  }

  private CentralPolicyEntity lockPolicyByVersion(UUID versionId) {
    return policies.lockByVersionId(versionId).orElseThrow(() -> notFound(versionId));
  }

  private void requireActivePolicy(CentralPolicyEntity policy) {
    if (policy.getStatus() != MasterDataLifecycleStatus.ACTIVE) {
      throw new UnprocessableEntityException(
          "INVALID_PARENT",
          "error.masterdata.v2.invalidParent",
          "Policy must be active",
          policy.getId());
    }
  }

  private CentralPolicyVersionEntity requireLockedVersion(
      List<CentralPolicyVersionEntity> versions, UUID id) {
    return versions.stream()
        .filter(version -> version.getId().equals(id))
        .findFirst()
        .orElseThrow(() -> notFound(id));
  }

  private void requireActiveDraft(CentralPolicyVersionEntity version) {
    if (version.getStatus() != MasterDataLifecycleStatus.ACTIVE
        || version.getVersionStatus() != PolicyVersionStatus.DRAFT) {
      throw immutable();
    }
  }

  private void requireDeletedDraft(CentralPolicyVersionEntity version) {
    if (version.getStatus() != MasterDataLifecycleStatus.DELETED
        || version.getVersionStatus() != PolicyVersionStatus.DRAFT) {
      throw immutable();
    }
  }

  private void assertVersion(CentralPolicyVersionEntity entity, long expectedVersion) {
    if (entity.getVersion() != expectedVersion) {
      throw new ConflictException(
          "VERSION_CONFLICT",
          "error.masterdata.v2.versionConflict",
          "The policy version has changed",
          entity.getId());
    }
  }

  private String normalizeContent(String content) {
    return content == null || content.isBlank() ? null : content.trim();
  }

  private UnprocessableEntityException immutable() {
    return new UnprocessableEntityException(
        "IMMUTABLE_POLICY_VERSION",
        "error.masterdata.v2.immutablePolicyVersion",
        "Published and superseded policy versions are immutable");
  }

  private NotFoundException policyNotFound(UUID id) {
    return new NotFoundException(
        "PARENT_NOT_FOUND", "error.masterdata.v2.parentNotFound", "Policy not found", id);
  }

  private NotFoundException notFound(UUID id) {
    return new NotFoundException(
        "MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound", "Policy Version not found", id);
  }

  private JsonNode snapshot(CentralPolicyVersionEntity entity) {
    Map<String, Object> snapshot = new LinkedHashMap<>();
    snapshot.put("id", entity.getId());
    snapshot.put("policyId", entity.getPolicyId());
    snapshot.put("versionNumber", entity.getVersionNumber());
    snapshot.put("content", entity.getContent());
    snapshot.put("versionStatus", entity.getVersionStatus());
    snapshot.put("publishedAt", entity.getPublishedAt());
    snapshot.put("publishedBy", entity.getPublishedBy());
    snapshot.put("status", entity.getStatus().wireValue());
    snapshot.put("validFrom", entity.getValidFrom());
    snapshot.put("validTo", entity.getValidTo());
    snapshot.put("version", entity.getVersion());
    snapshot.put("createdAt", entity.getCreatedAt());
    snapshot.put("createdBy", entity.getCreatedBy());
    snapshot.put("updatedAt", entity.getUpdatedAt());
    snapshot.put("updatedBy", entity.getUpdatedBy());
    snapshot.put("deletedAt", entity.getDeletedAt());
    snapshot.put("deletedBy", entity.getDeletedBy());
    return objectMapper.valueToTree(snapshot);
  }

  private RevisionContentResult content(
      CentralPolicyVersionEntity entity,
      RevisionOperationType operation,
      Long expectedVersion,
      JsonNode before) {
    return RevisionContentResult.completed(
        RevisionEntityType.CENTRAL_POLICY_VERSION,
        entity.getId(),
        operation,
        expectedVersion,
        before,
        snapshot(entity),
        entity.getVersion(),
        objectMapper.valueToTree(Map.of("validated", true)));
  }

  private RevisionContentResult refreshAppliedVersion(
      RevisionContentResult stale, List<CentralPolicyVersionEntity> versions) {
    CentralPolicyVersionEntity entity =
        versions.stream()
            .filter(version -> version.getId().equals(stale.entityId()))
            .findFirst()
            .orElseThrow();
    return content(entity, stale.operationType(), stale.expectedVersion(), stale.beforeSnapshot());
  }

  private RevisionOperationResult completed(
      RevisionExecutionContext context,
      CentralPolicyVersionEntity entity,
      RevisionOperationType operation,
      Long expectedVersion,
      JsonNode before) {
    return RevisionOperationResult.completed(
        context,
        new MasterDataMutationResult(entity.getId(), context.revisionId(), entity.getVersion()),
        List.of(content(entity, operation, expectedVersion, before)));
  }

  private boolean isEmpty(DocumentAggregateBatchRequest request) {
    return request == null
        || (request.newDocuments().isEmpty()
            && request.newVersions().isEmpty()
            && request.metadataUpdates().isEmpty());
  }
}
