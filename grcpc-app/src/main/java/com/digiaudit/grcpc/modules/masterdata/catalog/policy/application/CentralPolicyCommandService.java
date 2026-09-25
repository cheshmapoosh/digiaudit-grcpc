package com.digiaudit.grcpc.modules.masterdata.catalog.policy.application;

import com.digiaudit.grcpc.common.exception.*;
import com.digiaudit.grcpc.modules.document.api.dto.*;
import com.digiaudit.grcpc.modules.document.application.DocumentCommandService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.*;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataStructuralDependencyChecker;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.*;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class CentralPolicyCommandService {
  private final CentralPolicyRepository repository;
  private final CentralPolicyGroupRepository groups;
  private final MasterDataRevisionCoordinator revisions;
  private final MasterDataRevisionActorProvider actors;
  private final RevisionMutationGuard guard;
  private final DocumentCommandService documents;
  private final CatalogCommandSupport support;
  private final MasterDataStructuralDependencyChecker dependencyChecker;
  private final CentralPolicySubprocessScopeAggregateService subprocessScopes;
  private final CentralPolicyOrganizationScopeAggregateService organizationScopes;
  private final CentralPolicyControlScopeAggregateService controlScopes;
  private final CentralPolicyRequirementScopeAggregateService requirementScopes;
  private final CentralPolicySubprocessScopeQueryService subprocessQueries;
  private final CentralPolicyOrganizationScopeQueryService organizationQueries;
  private final CentralPolicyControlScopeQueryService controlQueries;
  private final CentralPolicyRequirementScopeQueryService requirementQueries;
  private final MasterDataAuthorizationService authorization;
  private final Clock clock;

  public CentralPolicyCommandService(
      CentralPolicyRepository r,
      CentralPolicyGroupRepository g,
      MasterDataRevisionCoordinator rev,
      MasterDataRevisionActorProvider a,
      RevisionMutationGuard gu,
      DocumentCommandService d,
      CatalogCommandSupport s,
      MasterDataStructuralDependencyChecker dc,
      CentralPolicySubprocessScopeAggregateService subprocessScopes,
      CentralPolicyOrganizationScopeAggregateService organizationScopes,
      CentralPolicyControlScopeAggregateService controlScopes,
      CentralPolicyRequirementScopeAggregateService requirementScopes,
      CentralPolicySubprocessScopeQueryService subprocessQueries,
      CentralPolicyOrganizationScopeQueryService organizationQueries,
      CentralPolicyControlScopeQueryService controlQueries,
      CentralPolicyRequirementScopeQueryService requirementQueries,
      MasterDataAuthorizationService authorization,
      @Qualifier("masterDataRevisionClock") Clock c) {
    repository = r;
    groups = g;
    revisions = rev;
    actors = a;
    guard = gu;
    documents = d;
    support = s;
    dependencyChecker = dc;
    this.subprocessScopes = subprocessScopes;
    this.organizationScopes = organizationScopes;
    this.controlScopes = controlScopes;
    this.requirementScopes = requirementScopes;
    this.subprocessQueries = subprocessQueries;
    this.organizationQueries = organizationQueries;
    this.controlQueries = controlQueries;
    this.requirementQueries = requirementQueries;
    this.authorization = authorization;
    clock = c;
  }

  public CentralPolicyDtos.PolicyAggregateResponse create(CentralPolicyDtos.CreatePolicy r) {
    String code = support.normalizeCode(r.code()),
        title = support.normalizeTitle(r.title()),
        responsibleOrganization = normalizeShortText(r.responsibleOrganization(), "responsibleOrganization"),
        objective = normalizeLongText(r.objective()),
        description = support.normalizeDescription(r.description());
    int sort = support.normalizeSortOrder(r.sortOrder());
    support.validateValidity(r.validFrom(), r.validTo());
    if (r.status() == MasterDataLifecycleStatus.DELETED)
      throw new UnprocessableEntityException("INVALID_LIFECYCLE_TRANSITION",
          "error.masterdata.v2.invalidLifecycleTransition",
          "Delete uses the Policy lifecycle command");
    MasterDataLifecycleStatus finalStatus = r.status() == null
        ? MasterDataLifecycleStatus.ACTIVE : r.status();
    AtomicReference<List<DocumentCommandResponse>> docs = new AtomicReference<>(List.of());
    try {
      var result =
          revisions.executeStructural(
              guardKeys(r.subprocessScopeChanges(), r.organizationScopeChanges(),
                  r.controlScopeChanges(), r.requirementScopeChanges()),
              RevisionRequest.central("Create policy " + code, "Policy structural create", null),
              c -> {
                requireGuard(c);
                requireGroup(r.policyGroupId());
                var e = repository.findByCode(code).orElse(null);
                RevisionOperationType op;
                Long expected;
                JsonNode before;
                UUID actor = actors.currentActorId();
                Instant now = Instant.now(clock);
                if (e == null) {
                  e =
                      CentralPolicyEntity.create(
                          UUID.randomUUID(),
                          code,
                          title,
                          r.policyGroupId(),
                          r.policyType(),
                          responsibleOrganization,
                          r.communicationMethod(),
                          r.nextReviewDate(),
                          objective,
                          r.content(),
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
                  if (!e.getPolicyGroupId().equals(r.policyGroupId())) throw invalidParent();
                  expected = e.getVersion();
                  before = snapshot(e);
                  if (e.getStatus() == MasterDataLifecycleStatus.DELETED) {
                    op = RevisionOperationType.RESTORE;
                  } else {
                    op = finalStatus == MasterDataLifecycleStatus.ACTIVE
                        ? RevisionOperationType.ACTIVATE : RevisionOperationType.UPDATE;
                  }
                }
                var prepared = documents.prepareAggregate(r.documents());
                var preparedSubprocess = subprocessScopes.prepare(c, e.getId(),
                    finalStatus, r.validFrom(), r.validTo(), r.subprocessScopeChanges());
                var preparedOrganization = organizationScopes.prepare(c, e.getId(),
                    finalStatus, r.validFrom(), r.validTo(), r.organizationScopeChanges());
                var preparedControl = controlScopes.prepare(c, e.getId(),
                    finalStatus, r.validFrom(), r.validTo(), r.controlScopeChanges());
                var preparedRequirement = requirementScopes.prepare(c, e.getId(),
                    finalStatus, r.validFrom(), r.validTo(), r.requirementScopeChanges());
                if (op == RevisionOperationType.RESTORE) {
                  e.restoreFromCreate(title, r.policyGroupId(), r.policyType(),
                      responsibleOrganization, r.communicationMethod(), r.nextReviewDate(),
                      objective, r.content(), description, sort, r.validFrom(), r.validTo(), actor, now);
                } else if (op == RevisionOperationType.ACTIVATE || op == RevisionOperationType.UPDATE) {
                  e.reactivateFromCreate(title, r.policyGroupId(), r.policyType(),
                      responsibleOrganization, r.communicationMethod(), r.nextReviewDate(),
                      objective, r.content(), description, sort, r.validFrom(), r.validTo(), actor, now);
                }
                if (finalStatus == MasterDataLifecycleStatus.INACTIVE)
                  e.inactivate(actor, now);
                var saved = repository.saveAndFlush(e);
                docs.set(
                    documents.finalizePreparedAggregate(
                        prepared,
                        DocumentLinkTargetType.CENTRAL_POLICY,
                        saved.getId(),
                        "MD_GOVERNANCE_MANAGE"));
                return combine(c, completed(c, saved, op, expected, before),
                    subprocessScopes.apply(preparedSubprocess, saved.getId()),
                    organizationScopes.apply(preparedOrganization, saved.getId()),
                    controlScopes.apply(preparedControl, saved.getId()),
                    requirementScopes.apply(preparedRequirement, saved.getId()));
              });
      return policyResponse(result, docs.get());
    } catch (DataIntegrityViolationException e) {
      throw support.translateBusinessKeyViolation(e, "UK_CENTRAL_POLICY_CODE", code);
    }
  }

  public CentralPolicyDtos.PolicyAggregateResponse update(UUID id, CentralPolicyDtos.UpdatePolicy r) {
    long expected = support.requireVersion(r.version());
    String title = support.normalizeTitle(r.title()),
        responsibleOrganization = normalizeShortText(r.responsibleOrganization(), "responsibleOrganization"),
        objective = normalizeLongText(r.objective()),
        description = support.normalizeDescription(r.description());
    support.validateValidity(r.validFrom(), r.validTo());
    AtomicReference<List<DocumentCommandResponse>> docs = new AtomicReference<>(List.of());
    var result =
        revisions.executeStructural(
            Set.of(MasterDataHierarchyKey.CONTROL, MasterDataHierarchyKey.ORGANIZATION,
                MasterDataHierarchyKey.POLICY, MasterDataHierarchyKey.PROCESS,
                MasterDataHierarchyKey.REGULATION),
            RevisionRequest.central("Update policy " + id, "Policy aggregate update", null),
            c -> {
              requireGuard(c);
              requireGroup(r.policyGroupId());
              var e = lock(id);
              support.assertVersion(e, expected);
              if (e.getStatus() == MasterDataLifecycleStatus.DELETED) throw notFound(id);
              if (Objects.equals(e.getTitle(), title)
                  && e.getPolicyType() == r.policyType()
                  && Objects.equals(e.getResponsibleOrganization(), responsibleOrganization)
                  && e.getCommunicationMethod() == r.communicationMethod()
                  && Objects.equals(e.getNextReviewDate(), r.nextReviewDate())
                  && Objects.equals(e.getObjective(), objective)
                  && Objects.equals(e.getContent(), r.content())
                  && Objects.equals(e.getDescription(), description)
                  && Objects.equals(e.getPolicyGroupId(), r.policyGroupId())
                  && e.getSortOrder() == support.normalizeSortOrder(r.sortOrder())
                  && (r.status() == null || e.getStatus() == r.status())
                  && Objects.equals(e.getValidFrom(), r.validFrom())
                  && Objects.equals(e.getValidTo(), r.validTo())
                  && empty(r.documents())
                  && (r.subprocessScopeChanges() == null || r.subprocessScopeChanges().isEmpty())
                  && (r.organizationScopeChanges() == null || r.organizationScopeChanges().isEmpty())
                  && (r.controlScopeChanges() == null || r.controlScopeChanges().isEmpty())
                  && (r.requirementScopeChanges() == null || r.requirementScopeChanges().isEmpty()))
                throw noChange();
              if (r.status() == MasterDataLifecycleStatus.DELETED)
                throw new UnprocessableEntityException("INVALID_LIFECYCLE_TRANSITION",
                    "error.masterdata.v2.invalidLifecycleTransition",
                    "Delete uses the Policy lifecycle command");
              var finalStatus = r.status() == null ? e.getStatus() : r.status();
              var prepared = documents.prepareAggregate(r.documents());
              var preparedSubprocess = subprocessScopes.prepare(c, id, finalStatus,
                  r.validFrom(), r.validTo(), r.subprocessScopeChanges());
              var preparedOrganization = organizationScopes.prepare(c, id, finalStatus,
                  r.validFrom(), r.validTo(), r.organizationScopeChanges());
              var preparedControl = controlScopes.prepare(c, id, finalStatus,
                  r.validFrom(), r.validTo(), r.controlScopeChanges());
              var preparedRequirement = requirementScopes.prepare(c, id, finalStatus,
                  r.validFrom(), r.validTo(), r.requirementScopeChanges());
              JsonNode before = snapshot(e);
              e.update(
                  title,
                  r.policyType(),
                  responsibleOrganization,
                  r.communicationMethod(),
                  r.nextReviewDate(),
                  objective,
                  r.content(),
                  description,
                  r.validFrom(),
                  r.validTo(),
                  actors.currentActorId(),
                  Instant.now(clock));
              e.move(r.policyGroupId(), support.normalizeSortOrder(r.sortOrder()),
                  actors.currentActorId(), Instant.now(clock));
              if (r.status() == MasterDataLifecycleStatus.INACTIVE
                  && e.getStatus() == MasterDataLifecycleStatus.ACTIVE)
                e.inactivate(actors.currentActorId(), Instant.now(clock));
              else if (r.status() == MasterDataLifecycleStatus.ACTIVE
                  && e.getStatus() == MasterDataLifecycleStatus.INACTIVE)
                e.activate(actors.currentActorId(), Instant.now(clock));
              var saved = repository.saveAndFlush(e);
              docs.set(
                  documents.finalizePreparedAggregate(
                      prepared,
                      DocumentLinkTargetType.CENTRAL_POLICY,
                      id,
                      "MD_GOVERNANCE_MANAGE"));
              return combine(c, completed(c, saved, RevisionOperationType.UPDATE, expected, before),
                  subprocessScopes.apply(preparedSubprocess, id),
                  organizationScopes.apply(preparedOrganization, id),
                  controlScopes.apply(preparedControl, id),
                  requirementScopes.apply(preparedRequirement, id));
            });
    return policyResponse(result, docs.get());
  }

  public MasterDataRevisionMutationResponse move(UUID id, CentralPolicyDtos.MovePolicy r) {
    long expected = support.requireVersion(r.version());
    int sort = support.normalizeSortOrder(r.sortOrder());
    var result =
        revisions.executeStructural(
            MasterDataHierarchyKey.POLICY,
            RevisionRequest.central("Move policy " + id, "Policy group move", null),
            c -> {
              requireGuard(c);
              requireGroup(r.policyGroupId());
              var e = lock(id);
              support.assertVersion(e, expected);
              e.requireNotDeleted();
              if (e.getPolicyGroupId().equals(r.policyGroupId()) && e.getSortOrder() == sort)
                throw invalidHierarchyMove();
              JsonNode before = snapshot(e);
              e.move(r.policyGroupId(), sort, actors.currentActorId(), Instant.now(clock));
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
            MasterDataHierarchyKey.POLICY,
            RevisionRequest.central(op + " policy " + id, "Policy lifecycle", null),
            c -> {
              requireGuard(c);
              var e = lock(id);
              support.assertVersion(e, expected);
              support.validateLifecycle(e, op);
              if (op == RevisionOperationType.DELETE
                  && dependencyChecker.centralPolicyHasApprovedDependencies(id))
                throw new ConflictException(
                    "DEPENDENCY_EXISTS",
                    "error.masterdata.v2.dependencyExists",
                    "Policy has approved scope dependencies",
                    id);
              if (op == RevisionOperationType.ACTIVATE || op == RevisionOperationType.RESTORE)
                requireGroup(e.getPolicyGroupId());
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
                        "Policy Group not found",
                        id));
    if (e.getStatus() == MasterDataLifecycleStatus.DELETED)
      throw new UnprocessableEntityException(
          "INVALID_PARENT", "error.masterdata.v2.invalidParent", "Policy Group is deleted");
  }

  private void requireGuard(RevisionExecutionContext c) {
    guard.requireHierarchyGuard(c, MasterDataHierarchyKey.POLICY);
  }

  private CentralPolicyEntity lock(UUID id) {
    return repository.lockById(id).orElseThrow(() -> notFound(id));
  }

  private NotFoundException notFound(UUID id) {
    return new NotFoundException(
        "MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound", "Policy not found", id);
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

  private String normalizeShortText(String value, String fieldName) {
    if (value == null || value.isBlank()) return null;
    String normalized = value.trim();
    if (normalized.length() > 255) {
      throw new UnprocessableEntityException(
          "INVALID_POLICY_METADATA",
          "error.masterdata.v2.invalidPolicyMetadata",
          fieldName + " exceeds 255 characters");
    }
    return normalized;
  }

  private String normalizeLongText(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private Map<String, ?> typed(CentralPolicyEntity e) {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("policyGroupId", e.getPolicyGroupId());
    fields.put("policyType", e.getPolicyType());
    fields.put("responsibleOrganization", e.getResponsibleOrganization());
    fields.put("communicationMethod", e.getCommunicationMethod());
    fields.put("nextReviewDate", e.getNextReviewDate());
    fields.put("objective", e.getObjective());
    fields.put("content", e.getContent());
    fields.put("sortOrder", e.getSortOrder());
    return fields;
  }

  private JsonNode snapshot(CentralPolicyEntity e) {
    return support.snapshot(e, typed(e));
  }

  private RevisionOperationResult completed(
      RevisionExecutionContext c,
      CentralPolicyEntity e,
      RevisionOperationType o,
      Long v,
      JsonNode b) {
    return support.completed(c, e, RevisionEntityType.CENTRAL_POLICY, o, v, b, typed(e));
  }

  private Set<MasterDataHierarchyKey> guardKeys(
      List<?> subprocess, List<?> organization, List<?> control, List<?> requirement) {
    EnumSet<MasterDataHierarchyKey> keys = EnumSet.of(MasterDataHierarchyKey.POLICY);
    if (subprocess != null && !subprocess.isEmpty()) keys.add(MasterDataHierarchyKey.PROCESS);
    if (organization != null && !organization.isEmpty()) keys.add(MasterDataHierarchyKey.ORGANIZATION);
    if (control != null && !control.isEmpty()) {
      keys.add(MasterDataHierarchyKey.CONTROL);
      keys.add(MasterDataHierarchyKey.PROCESS);
    }
    if (requirement != null && !requirement.isEmpty()) {
      keys.add(MasterDataHierarchyKey.PROCESS);
      keys.add(MasterDataHierarchyKey.REGULATION);
    }
    return keys;
  }

  @SafeVarargs
  private final RevisionOperationResult combine(
      RevisionExecutionContext c, RevisionOperationResult owner,
      List<RevisionContentResult>... relationContents) {
    List<RevisionContentResult> all = new ArrayList<>(owner.contentResults());
    for (var contents : relationContents) all.addAll(contents);
    return RevisionOperationResult.completed(c, owner.primaryResult(), all);
  }

  private CentralPolicyDtos.PolicyAggregateResponse policyResponse(
      RevisionExecutionResult result, List<DocumentCommandResponse> finalized) {
    var primary = result.primaryResult();
    UUID id = primary.entityId();
    return new CentralPolicyDtos.PolicyAggregateResponse(
        id, primary.revisionId(), primary.version(), finalized,
        authorization.canView("PROCESS") ? subprocessQueries.list(id, null, null) : List.of(),
        authorization.canView("REFERENCE") ? organizationQueries.list(id, null, null) : List.of(),
        authorization.canView("PROCESS") && authorization.canView("CONTROL")
            ? controlQueries.list(id, null, null) : List.of(),
        authorization.canView("PROCESS") ? requirementQueries.list(id, null, null) : List.of());
  }

  private boolean empty(DocumentAggregateBatchRequest r) {
    return r == null
        || (r.newDocuments().isEmpty()
            && r.newVersions().isEmpty()
            && r.metadataUpdates().isEmpty());
  }
}
