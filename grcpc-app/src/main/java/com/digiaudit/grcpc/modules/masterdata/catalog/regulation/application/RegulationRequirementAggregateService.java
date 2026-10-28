package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.CentralRegulationDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.CentralRegulationDtos.RequirementChange;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationRequirementEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRequirementRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.mapper.CentralRegulationMapper;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.application.CatalogCommandSupport;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionMutationGuard;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionActorProvider;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataStructuralDependencyChecker;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Concrete structural-child prepare/apply, inside the existing Regulation Revision transaction. */
@Service
public class RegulationRequirementAggregateService {
  private final CentralRegulationRequirementRepository repository;
  private final CatalogCommandSupport support;
  private final RevisionMutationGuard guard;
  private final MasterDataRevisionActorProvider actors;
  private final MasterDataStructuralDependencyChecker dependencyChecker;
  private final CentralRegulationMapper mapper;
  private final Clock clock;

  public RegulationRequirementAggregateService(CentralRegulationRequirementRepository repository,
      CatalogCommandSupport support, RevisionMutationGuard guard, MasterDataRevisionActorProvider actors,
      MasterDataStructuralDependencyChecker dependencyChecker, CentralRegulationMapper mapper,
      @Qualifier("masterDataRevisionClock") Clock clock) {
    this.repository = repository;
    this.support = support;
    this.guard = guard;
    this.actors = actors;
    this.dependencyChecker = dependencyChecker;
    this.mapper = mapper;
    this.clock = clock;
  }

  public record Plan(List<Change> changes) {
    public boolean changed() { return !changes.isEmpty(); }
  }

  public record Change(CentralRegulationRequirementEntity entity, RevisionOperationType operation,
      Long expectedVersion, JsonNode before, String title, String description, int sortOrder,
      LocalDate validFrom, LocalDate validTo, MasterDataLifecycleStatus status) {}

  public record Applied(List<RevisionContentResult> contents,
      List<CentralRegulationDtos.RequirementDetail> requirements) {}

  @Transactional(propagation = Propagation.MANDATORY)
  public Plan prepare(UUID regulationId, List<RequirementChange> requested, RevisionExecutionContext context) {
    if (requested == null || requested.isEmpty()) return new Plan(List.of());
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.CONTROL);
    guard.requireHierarchyGuard(context, MasterDataHierarchyKey.REGULATION);
    if (requested.size() > 5000) throw invalid();
    var ids = new HashSet<UUID>();
    var codes = new HashSet<String>();
    for (var change : requested) {
      if (change == null || change.operation() == null) throw invalid();
      if (change.operation() == CentralRegulationDtos.RequirementChangeOperation.CREATE) {
        if (change.requirementId() != null || change.version() != null
            || change.requestedStatus() != null && change.requestedStatus() != MasterDataLifecycleStatus.ACTIVE) throw invalid();
        String code = support.normalizeCode(change.code());
        if (!codes.add(code)) throw support.duplicate(code);
      } else if (change.requirementId() == null || !ids.add(change.requirementId())) throw invalid();
    }
    // The REGULATION Guard serializes every competing create/restore of these business keys.
    if (!codes.isEmpty()) {
      var sortedCodes = codes.stream().sorted().toList();
      for (int offset = 0; offset < sortedCodes.size(); offset += 1000) {
        var stored = repository.findByCodeIn(sortedCodes.subList(offset, Math.min(offset + 1000, sortedCodes.size())));
        if (!stored.isEmpty()) throw support.duplicate(stored.getFirst().getCode());
      }
    }
    var storedById = new LinkedHashMap<UUID, CentralRegulationRequirementEntity>();
    var sortedIds = ids.stream().sorted().toList();
    for (int offset = 0; offset < sortedIds.size(); offset += 1000) {
      repository.lockAllByIds(sortedIds.subList(offset, Math.min(offset + 1000, sortedIds.size())))
          .forEach(row -> storedById.put(row.getId(), row));
    }
    var planned = new ArrayList<Change>();
    UUID actor = actors.currentActorId();
    Instant now = Instant.now(clock);
    for (var request : requested) {
      if (request.operation() == CentralRegulationDtos.RequirementChangeOperation.CREATE) {
        String code = support.normalizeCode(request.code());
        String title = support.normalizeTitle(request.title());
        String description = description(request.description());
        int sort = support.normalizeSortOrder(request.sortOrder());
        support.validateValidity(request.validFrom(), request.validTo());
        var entity = CentralRegulationRequirementEntity.create(UUID.randomUUID(), code, title, regulationId,
            description, sort, request.validFrom(), request.validTo(), actor, now);
        planned.add(new Change(entity, RevisionOperationType.CREATE, null, null,
            title, description, sort, request.validFrom(), request.validTo(), MasterDataLifecycleStatus.ACTIVE));
        continue;
      }
      var entity = storedById.get(request.requirementId());
      if (entity == null) throw new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound",
          "Requirement not found", request.requirementId());
      if (!entity.getRegulationId().equals(regulationId)) throw invalid();
      long version = support.requireVersion(request.version());
      support.assertVersion(entity, version);
      if (request.code() != null && !support.normalizeCode(request.code()).equals(entity.getCode())) throw invalid();
      var operation = switch (request.operation()) {
        case UPDATE -> RevisionOperationType.UPDATE;
        case ACTIVATE -> RevisionOperationType.ACTIVATE;
        case INACTIVATE -> RevisionOperationType.INACTIVATE;
        case DELETE -> RevisionOperationType.DELETE;
        default -> throw invalid();
      };
      String title = entity.getTitle();
      String description = entity.getDescription();
      int sort = entity.getSortOrder();
      LocalDate from = entity.getValidFrom(), to = entity.getValidTo();
      var status = entity.getStatus();
      if (operation == RevisionOperationType.UPDATE) {
        if (status == MasterDataLifecycleStatus.DELETED) throw invalid();
        title = support.normalizeTitle(request.title());
        description = description(request.description());
        sort = request.sortOrder() == null ? sort : support.normalizeSortOrder(request.sortOrder());
        from = request.validFrom(); to = request.validTo();
        support.validateValidity(from, to);
        status = request.requestedStatus() == null ? entity.getStatus() : request.requestedStatus();
        if (status == MasterDataLifecycleStatus.DELETED) throw invalid();
        if (status != entity.getStatus()) support.validateLifecycle(entity,
            status == MasterDataLifecycleStatus.ACTIVE ? RevisionOperationType.ACTIVATE : RevisionOperationType.INACTIVATE);
        if (Objects.equals(title, entity.getTitle()) && Objects.equals(description, entity.getDescription())
            && sort == entity.getSortOrder() && Objects.equals(from, entity.getValidFrom())
            && Objects.equals(to, entity.getValidTo()) && status == entity.getStatus()) continue;
      } else {
        status = operation == RevisionOperationType.ACTIVATE ? MasterDataLifecycleStatus.ACTIVE
            : operation == RevisionOperationType.INACTIVATE ? MasterDataLifecycleStatus.INACTIVE : MasterDataLifecycleStatus.DELETED;
        if (status == entity.getStatus()) continue;
        support.validateLifecycle(entity, operation);
        if (operation == RevisionOperationType.DELETE
            && dependencyChecker.centralRegulationRequirementHasApprovedDependencies(entity.getId())) {
          throw new ConflictException("DEPENDENCY_EXISTS", "error.masterdata.v2.dependencyExists",
              "Requirement has approved scope or assignment dependencies", entity.getId());
        }
      }
      planned.add(new Change(entity, operation, version, support.snapshot(entity, typed(entity)),
          title, description, sort, from, to, status));
    }
    return new Plan(List.copyOf(planned));
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public Applied apply(Plan plan, RevisionExecutionContext context) {
    if (plan.changed()) {
      guard.requireHierarchyGuard(context, MasterDataHierarchyKey.CONTROL);
      guard.requireHierarchyGuard(context, MasterDataHierarchyKey.REGULATION);
    }
    var contents = new ArrayList<RevisionContentResult>();
    var canonical = new ArrayList<CentralRegulationDtos.RequirementDetail>();
    var savedEntities = new LinkedHashMap<UUID, CentralRegulationRequirementEntity>();
    UUID actor = actors.currentActorId();
    Instant now = Instant.now(clock);
    for (var change : plan.changes()) {
      var entity = change.entity();
      switch (change.operation()) {
        case CREATE -> { /* A new entity is prepared, but has never been persisted. */ }
        case UPDATE -> {
          entity.update(change.title(), change.description(), change.validFrom(), change.validTo(), actor, now);
          entity.move(entity.getRegulationId(), change.sortOrder(), actor, now);
          if (entity.getStatus() != change.status()) {
            if (change.status() == MasterDataLifecycleStatus.ACTIVE) entity.activate(actor, now);
            else entity.inactivate(actor, now);
          }
        }
        case ACTIVATE -> entity.activate(actor, now);
        case INACTIVATE -> entity.inactivate(actor, now);
        case DELETE -> entity.delete(actor, now);
        default -> throw invalid();
      }
      savedEntities.put(entity.getId(), repository.save(entity));
    }
    try {
      repository.flush();
    } catch (DataIntegrityViolationException exception) {
      String code = plan.changes().stream().filter(change -> change.operation() == RevisionOperationType.CREATE)
          .map(change -> change.entity().getCode()).findFirst().orElse("");
      throw support.translateBusinessKeyViolation(exception, "UK_CENTRAL_REG_REQUIREMENT_CODE", code);
    }
    for (var change : plan.changes()) {
      var entity = savedEntities.get(change.entity().getId());
      contents.addAll(support.completed(context, entity, RevisionEntityType.CENTRAL_REGULATION_REQUIREMENT,
          change.operation(), change.expectedVersion(), change.before(), typed(entity)).contentResults());
      canonical.add(mapper.detail(entity));
    }
    return new Applied(List.copyOf(contents), List.copyOf(canonical));
  }

  private Map<String, ?> typed(CentralRegulationRequirementEntity entity) {
    return Map.of("regulationId", entity.getRegulationId(), "sortOrder", entity.getSortOrder());
  }

  private String description(String value) {
    String normalized = support.normalizeDescription(value);
    if (normalized != null && normalized.length() > 32767) throw new UnprocessableEntityException(
        "INVALID_DESCRIPTION", "error.masterdata.regulationImport.descriptionLength", "Description exceeds 32767 characters");
    return normalized;
  }

  private UnprocessableEntityException invalid() {
    return new UnprocessableEntityException("INVALID_REQUIREMENT_DRAFT", "error.masterdata.regulation.requirementDraft",
        "Requirement draft must identify a child of the saved Regulation and a valid operation");
  }
}
