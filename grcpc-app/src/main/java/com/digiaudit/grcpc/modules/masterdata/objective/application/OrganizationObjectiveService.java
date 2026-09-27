package com.digiaudit.grcpc.modules.masterdata.objective.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.objective.api.OrganizationObjectiveDtos;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.*;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationObjectiveService {
  private final OrganizationObjectiveRepository assignments;
  private final OrganizationRepository organizations;
  private final ObjectiveRepository objectives;
  private final MasterDataRevisionCoordinator revisions;
  private final MasterDataRevisionActorProvider actors;
  private final RevisionMutationGuard mutationGuard;
  private final CatalogCommandSupport support;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public OrganizationObjectiveService(OrganizationObjectiveRepository assignments,
      OrganizationRepository organizations, ObjectiveRepository objectives,
      MasterDataRevisionCoordinator revisions, MasterDataRevisionActorProvider actors,
      RevisionMutationGuard mutationGuard, CatalogCommandSupport support,
      ObjectMapper objectMapper, @Qualifier("masterDataRevisionClock") Clock clock) {
    this.assignments = assignments;
    this.organizations = organizations;
    this.objectives = objectives;
    this.revisions = revisions;
    this.actors = actors;
    this.mutationGuard = mutationGuard;
    this.support = support;
    this.objectMapper = objectMapper;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<OrganizationObjectiveDtos.Detail> list(UUID organizationId) {
    requireOrganization(organizationId);
    return assignments.findByOrganizationIdAndStatusNotOrderByNameAsc(
        organizationId, MasterDataLifecycleStatus.DELETED).stream().map(this::detail).toList();
  }

  @Transactional(readOnly = true)
  public List<OrganizationObjectiveDtos.OrganizationLink> listOrganizations(UUID objectiveId) {
    requireObjective(objectiveId);
    return assignments.findByObjectiveIdAndStatusNotOrderByNameAsc(
        objectiveId, MasterDataLifecycleStatus.DELETED).stream()
        .map(assignment -> {
          var organization = organizations.findById(assignment.getOrganizationId()).orElse(null);
          if (organization == null || organization.getStatus() == MasterDataLifecycleStatus.DELETED)
            return null;
          return new OrganizationObjectiveDtos.OrganizationLink(organization.getId(),
              organization.getCode(), organization.getName(), assignment.getName(),
              assignment.getOwner(), assignment.getStatus(), assignment.getVersion());
        }).filter(java.util.Objects::nonNull).toList();
  }

  public MasterDataRevisionMutationResponse assign(UUID organizationId,
      OrganizationObjectiveDtos.Create request) {
    support.validateValidity(request.validFrom(), request.validTo());
    RevisionExecutionResult result = revisions.executeStructural(
        List.of(MasterDataHierarchyKey.OBJECTIVE, MasterDataHierarchyKey.ORGANIZATION),
        RevisionRequest.local(organizationId, "Assign objective " + request.objectiveId(),
            "Organization objective assignment", null),
        context -> {
          requireGuards(context);
          requireOrganization(organizationId);
          ObjectiveEntity objective = requireObjective(request.objectiveId());
          String name = normalizedName(request.name(), objective.getName());
          var existing = assignments.findByOrganizationIdAndObjectiveId(
              organizationId, objective.getId()).orElse(null);
          UUID actor = actors.currentActorId();
          Instant now = Instant.now(clock);
          OrganizationObjectiveEntity entity;
          RevisionOperationType operation;
          Long expected;
          JsonNode before;
          if (existing == null) {
            entity = new OrganizationObjectiveEntity(UUID.randomUUID(), organizationId,
                objective.getId(), name, support.normalizeDescription(request.description()),
                normalizeOwner(request.owner()), request.validFrom(), request.validTo(), actor, now);
            operation = RevisionOperationType.CREATE;
            expected = null;
            before = null;
          } else if (existing.getStatus() == MasterDataLifecycleStatus.DELETED) {
            entity = existing;
            expected = entity.getVersion();
            before = snapshot(entity);
            entity.restore(name, support.normalizeDescription(request.description()),
                normalizeOwner(request.owner()), request.validFrom(), request.validTo(), actor, now);
            operation = RevisionOperationType.RESTORE;
          } else {
            throw new ConflictException("DUPLICATE_BUSINESS_KEY",
                "error.masterdata.v2.duplicateBusinessKey", "Objective already assigned",
                objective.getId());
          }
          entity = assignments.saveAndFlush(entity);
          return completed(context, entity, operation, expected, before);
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  public MasterDataRevisionMutationResponse update(UUID organizationId, UUID objectiveId,
      OrganizationObjectiveDtos.Update request) {
    long expected = support.requireVersion(request.version());
    support.validateValidity(request.validFrom(), request.validTo());
    RevisionExecutionResult result = revisions.executeStructural(
        List.of(MasterDataHierarchyKey.OBJECTIVE, MasterDataHierarchyKey.ORGANIZATION),
        RevisionRequest.local(organizationId, "Update objective assignment " + objectiveId,
            "Organization objective update", null),
        context -> {
          requireGuards(context);
          requireOrganization(organizationId);
          requireObjective(objectiveId);
          OrganizationObjectiveEntity entity = requireAssignment(organizationId, objectiveId);
          assertVersion(entity, expected);
          JsonNode before = snapshot(entity);
          entity.update(support.normalizeTitle(request.name()),
              support.normalizeDescription(request.description()), normalizeOwner(request.owner()),
              request.validFrom(), request.validTo(), actors.currentActorId(), Instant.now(clock));
          entity = assignments.saveAndFlush(entity);
          return completed(context, entity, RevisionOperationType.UPDATE, expected, before);
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  public MasterDataRevisionMutationResponse remove(UUID organizationId, UUID objectiveId,
      Long version) {
    long expected = support.requireVersion(version);
    RevisionExecutionResult result = revisions.executeStructural(
        List.of(MasterDataHierarchyKey.OBJECTIVE, MasterDataHierarchyKey.ORGANIZATION),
        RevisionRequest.local(organizationId, "Remove objective assignment " + objectiveId,
            "Organization objective removal", null),
        context -> {
          requireGuards(context);
          requireOrganization(organizationId);
          OrganizationObjectiveEntity entity = requireAssignment(organizationId, objectiveId);
          assertVersion(entity, expected);
          JsonNode before = snapshot(entity);
          entity.delete(actors.currentActorId(), Instant.now(clock));
          entity = assignments.saveAndFlush(entity);
          return completed(context, entity, RevisionOperationType.DELETE, expected, before);
        });
    return MasterDataRevisionMutationResponse.from(result.primaryResult());
  }

  private RevisionOperationResult completed(RevisionExecutionContext context,
      OrganizationObjectiveEntity entity, RevisionOperationType operation, Long expected,
      JsonNode before) {
    MasterDataMutationResult primary = new MasterDataMutationResult(
        entity.getId(), context.revisionId(), entity.getVersion());
    RevisionContentResult content = RevisionContentResult.completed(
        RevisionEntityType.ORGANIZATION_OBJECTIVE, entity.getId(), operation,
        expected, before, snapshot(entity), entity.getVersion(),
        objectMapper.valueToTree(java.util.Map.of("validated", true)));
    return RevisionOperationResult.completed(context, primary, List.of(content));
  }

  private JsonNode snapshot(OrganizationObjectiveEntity entity) {
    return objectMapper.valueToTree(detail(entity));
  }

  private OrganizationObjectiveDtos.Detail detail(OrganizationObjectiveEntity entity) {
    String code = objectives.findById(entity.getObjectiveId()).map(ObjectiveEntity::getCode).orElse("");
    return new OrganizationObjectiveDtos.Detail(entity.getId(), entity.getOrganizationId(),
        entity.getObjectiveId(), code, entity.getName(), entity.getDescription(),
        entity.getOwner(), entity.getValidFrom(), entity.getValidTo(), entity.getStatus(),
        entity.getVersion(), entity.getCreatedAt(), entity.getUpdatedAt());
  }

  private void requireGuards(RevisionExecutionContext context) {
    mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.OBJECTIVE);
    mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.ORGANIZATION);
  }

  private void requireOrganization(UUID id) {
    if (!organizations.existsByIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED))
      throw new NotFoundException("ORGANIZATION_NOT_FOUND", "error.masterdata.v2.notFound",
          "Organization not found", id);
  }

  private ObjectiveEntity requireObjective(UUID id) {
    ObjectiveEntity objective = objectives.findById(id).orElseThrow(() -> objectiveNotFound(id));
    if (objective.getStatus() != MasterDataLifecycleStatus.ACTIVE) throw objectiveNotFound(id);
    return objective;
  }

  private OrganizationObjectiveEntity requireAssignment(UUID organizationId, UUID objectiveId) {
    OrganizationObjectiveEntity entity = assignments.findByOrganizationIdAndObjectiveId(
        organizationId, objectiveId).orElseThrow(() -> assignmentNotFound(objectiveId));
    if (entity.getStatus() == MasterDataLifecycleStatus.DELETED) throw assignmentNotFound(objectiveId);
    return entity;
  }

  private void assertVersion(OrganizationObjectiveEntity entity, long expected) {
    if (entity.getVersion() != expected)
      throw new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict",
          "Organization objective has changed", entity.getId());
  }

  private String normalizedName(String value, String fallback) {
    return support.normalizeTitle(value == null || value.isBlank() ? fallback : value);
  }

  private String normalizeOwner(String value) {
    if (value == null || value.isBlank()) return null;
    String owner = value.trim();
    if (owner.length() > 255)
      throw new UnprocessableEntityException("INVALID_OWNER",
          "error.masterdata.objective.ownerLength", "Owner exceeds 255 characters");
    return owner;
  }

  private NotFoundException objectiveNotFound(UUID id) {
    return new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound",
        "Objective not found", id);
  }

  private NotFoundException assignmentNotFound(UUID id) {
    return new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound",
        "Organization objective not found", id);
  }
}
