package com.digiaudit.grcpc.modules.masterdata.objective.application;

import static com.digiaudit.grcpc.common.util.Dates.*;
import static com.digiaudit.grcpc.common.util.Texts.*;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.masterdata.objective.api.dto.ObjectiveNodeRequest;
import com.digiaudit.grcpc.modules.masterdata.objective.api.dto.ObjectiveNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.objective.api.dto.ObjectiveOrganizationResponse;
import com.digiaudit.grcpc.modules.masterdata.objective.api.mapper.ObjectiveMapper;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.entity.ObjectiveNodeEntity;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.entity.ObjectiveOrganizationAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.repository.ObjectiveNodeRepository;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.repository.ObjectiveOrganizationAssignmentRepository;
import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationEntity;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ObjectiveService {
    private final ObjectiveNodeRepository repository;
    private final ObjectiveOrganizationAssignmentRepository organizationAssignmentRepository;
    private final OrganizationRepository organizationRepository;
    private final ObjectiveMapper mapper;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<ObjectiveNodeResponse> findAll() {
        return toResponses(repository.findAllByOrderBySortOrderAscTitleAsc());
    }

    public List<ObjectiveNodeResponse> findAll(String nodeType) {
        return findAll(nodeType, null);
    }

    public List<ObjectiveNodeResponse> findAll(String nodeType, UUID organizationId) {
        if (organizationId != null) {
            return findByOrganization(organizationId, nodeType);
        }

        String normalizedNodeType = normalizeNullable(nodeType);
        return normalizedNodeType == null ? findAll() : findByNodeType(normalizedNodeType);
    }

    public List<ObjectiveNodeResponse> findByNodeType(String nodeType) {
        String normalizedNodeType = normalizeRequired(nodeType);
        validateNodeType(normalizedNodeType);
        return toResponses(repository.findByNodeTypeOrderBySortOrderAscTitleAsc(normalizedNodeType));
    }

    public List<ObjectiveNodeResponse> findByOrganization(UUID organizationId, String nodeType) {
        ensureOrganization(organizationId);
        String normalizedNodeType = normalizeNullable(nodeType);
        if (normalizedNodeType != null) {
            validateNodeType(normalizedNodeType);
        }

        List<UUID> objectiveIds = organizationAssignmentRepository
                .findByOrganizationIdAndActiveTrueOrderByCreatedAtAsc(organizationId)
                .stream()
                .map(ObjectiveOrganizationAssignmentEntity::getObjectiveNodeId)
                .toList();
        if (objectiveIds.isEmpty()) {
            return List.of();
        }

        List<ObjectiveNodeEntity> objectives = repository.findAllById(objectiveIds)
                .stream()
                .filter(entity -> normalizedNodeType == null || normalizedNodeType.equals(entity.getNodeType()))
                .sorted(this::compareObjectives)
                .toList();

        return toResponses(objectives);
    }

    public List<ObjectiveNodeResponse> findRoots() {
        return toResponses(repository.findByParentIdIsNullOrderBySortOrderAscTitleAsc());
    }

    public List<ObjectiveNodeResponse> findChildren(UUID parentId) {
        ensureExists(parentId);
        return toResponses(repository.findByParentIdOrderBySortOrderAscTitleAsc(parentId));
    }

    public ObjectiveNodeResponse findById(UUID id) {
        return toResponse(get(id));
    }

    @Transactional
    public ObjectiveNodeResponse create(ObjectiveNodeRequest request, HttpServletRequest httpRequest) {
        List<UUID> organizationIds = normalizeOrganizationIds(request.organizationIds());
        ensureOrganizations(organizationIds);
        validateNodeType(request.nodeType() == null ? "objective" : request.nodeType());
        validateCode(request.code(), null);
        validateParent(request.parentId());
        ObjectiveNodeEntity saved = repository.save(fill(ObjectiveNodeEntity.builder().build(), request));
        syncOrganizationAssignments(saved.getId(), organizationIds);
        audit("OBJECTIVE_CREATED", saved.getId(), httpRequest, Map.of("code", saved.getCode()));
        return toResponse(saved);
    }

    @Transactional
    public ObjectiveNodeResponse update(UUID id, ObjectiveNodeRequest request, HttpServletRequest httpRequest) {
        List<UUID> organizationIds = request.organizationIds() == null ? null : normalizeOrganizationIds(request.organizationIds());
        if (organizationIds != null) {
            ensureOrganizations(organizationIds);
        }
        ObjectiveNodeEntity entity = get(id);
        String targetCode = request.code() == null ? entity.getCode() : request.code();
        String targetNodeType = request.nodeType() == null ? entity.getNodeType() : request.nodeType();
        validateNodeType(targetNodeType);
        validateCode(targetCode, id);
        if (id.equals(request.parentId())) {
            throw invalidParent(request.parentId());
        }
        validateParent(request.parentId());
        ensureNoCycle(id, request.parentId());
        ObjectiveNodeEntity saved = repository.save(fillUpdate(entity, request));
        if (organizationIds != null) {
            syncOrganizationAssignments(saved.getId(), organizationIds);
        }
        audit("OBJECTIVE_UPDATED", saved.getId(), httpRequest, Map.of("code", saved.getCode()));
        return toResponse(saved);
    }

    @Transactional
    public ObjectiveNodeResponse toggleStatus(UUID id, HttpServletRequest httpRequest) {
        ObjectiveNodeEntity entity = get(id);
        entity.setStatus(toggleActiveInactive(entity.getStatus()));
        ObjectiveNodeEntity saved = repository.save(entity);
        audit("OBJECTIVE_UPDATED", id, httpRequest, Map.of("status", saved.getStatus()));
        return toResponse(saved);
    }

    @Transactional
    public void delete(UUID id, HttpServletRequest httpRequest) {
        ObjectiveNodeEntity entity = get(id);
        if (repository.existsByParentId(id)) {
            throw new ConflictException("MASTER_DATA_HAS_CHILDREN", "error.masterdata.hasChildren", "Objective node has children: " + id);
        }
        organizationAssignmentRepository.deleteByObjectiveNodeId(id);
        repository.delete(entity);
        audit("OBJECTIVE_DELETED", id, httpRequest, Map.of("code", entity.getCode()));
    }

    private ObjectiveNodeEntity fill(ObjectiveNodeEntity entity, ObjectiveNodeRequest request) {
        LocalDate effectiveFrom = parseNullable(request.effectiveFrom());
        LocalDate validUntil = parseNullable(request.validUntil());
        requireValidRange(effectiveFrom, validUntil, "Objective validUntil cannot be before effectiveFrom");
        entity.setCode(normalizeRequired(request.code()));
        entity.setTitle(normalizeRequired(request.title()));
        entity.setNodeType(normalizeNullable(request.nodeType()) == null ? "objective" : normalizeNullable(request.nodeType()));
        entity.setParentId(request.parentId());
        entity.setStatus(normalizeNullable(request.status()) == null ? "active" : normalizeNullable(request.status()));
        entity.setSortOrder(request.sortOrder());
        entity.setDescription(normalizeNullable(request.description()));
        entity.setStrategy(normalizeNullable(request.strategy()));
        entity.setObjectiveType(normalizeNullable(request.objectiveType()));
        entity.setObjectiveClass(normalizeNullable(request.objectiveClass()));
        entity.setOrganizationUnitId(request.organizationUnitId());
        entity.setOrganizationUnitName(normalizeNullable(request.organizationUnitName()));
        entity.setEffectiveFrom(effectiveFrom);
        entity.setValidUntil(validUntil);
        entity.setDocumentsCount(request.documentsCount() == null ? 0 : request.documentsCount());
        return entity;
    }

    private ObjectiveNodeEntity fillUpdate(ObjectiveNodeEntity entity, ObjectiveNodeRequest request) {
        LocalDate effectiveFrom = request.effectiveFrom() == null ? entity.getEffectiveFrom() : parseNullable(request.effectiveFrom());
        LocalDate validUntil = request.validUntil() == null ? entity.getValidUntil() : parseNullable(request.validUntil());
        requireValidRange(effectiveFrom, validUntil, "Objective validUntil cannot be before effectiveFrom");

        if (request.code() != null) {
            entity.setCode(normalizeRequired(request.code()));
        }
        if (request.title() != null) {
            entity.setTitle(normalizeRequired(request.title()));
        }
        if (request.nodeType() != null) {
            entity.setNodeType(normalizeNullable(request.nodeType()) == null ? "objective" : normalizeNullable(request.nodeType()));
        }
        entity.setParentId(request.parentId());
        if (request.status() != null) {
            entity.setStatus(normalizeNullable(request.status()) == null ? "active" : normalizeNullable(request.status()));
        }
        if (request.sortOrder() != null) {
            entity.setSortOrder(request.sortOrder());
        }
        if (request.description() != null) {
            entity.setDescription(normalizeNullable(request.description()));
        }
        if (request.strategy() != null) {
            entity.setStrategy(normalizeNullable(request.strategy()));
        }
        if (request.objectiveType() != null) {
            entity.setObjectiveType(normalizeNullable(request.objectiveType()));
        }
        if (request.objectiveClass() != null) {
            entity.setObjectiveClass(normalizeNullable(request.objectiveClass()));
        }
        if (request.organizationUnitId() != null) {
            entity.setOrganizationUnitId(request.organizationUnitId());
        }
        if (request.organizationUnitName() != null) {
            entity.setOrganizationUnitName(normalizeNullable(request.organizationUnitName()));
        }
        if (request.effectiveFrom() != null) {
            entity.setEffectiveFrom(effectiveFrom);
        }
        if (request.validUntil() != null) {
            entity.setValidUntil(validUntil);
        }
        if (request.documentsCount() != null) {
            entity.setDocumentsCount(request.documentsCount());
        }
        return entity;
    }

    private void syncOrganizationAssignments(UUID objectiveId, List<UUID> organizationIds) {
        Set<UUID> requestedOrganizationIds = new LinkedHashSet<>(organizationIds);
        List<ObjectiveOrganizationAssignmentEntity> existingAssignments =
                organizationAssignmentRepository.findByObjectiveNodeIdOrderByCreatedAtAsc(objectiveId);
        Map<UUID, ObjectiveOrganizationAssignmentEntity> assignmentsByOrganizationId =
                existingAssignments.stream()
                        .collect(Collectors.toMap(
                                ObjectiveOrganizationAssignmentEntity::getOrganizationId,
                                Function.identity(),
                                (left, right) -> left,
                                LinkedHashMap::new
                        ));

        List<ObjectiveOrganizationAssignmentEntity> toSave = new ArrayList<>();

        for (ObjectiveOrganizationAssignmentEntity assignment : existingAssignments) {
            boolean shouldBeActive = requestedOrganizationIds.contains(assignment.getOrganizationId());
            if (assignment.isActive() != shouldBeActive) {
                assignment.setActive(shouldBeActive);
                toSave.add(assignment);
            }
        }

        for (UUID organizationId : requestedOrganizationIds) {
            if (!assignmentsByOrganizationId.containsKey(organizationId)) {
                toSave.add(ObjectiveOrganizationAssignmentEntity.builder()
                        .objectiveNodeId(objectiveId)
                        .organizationId(organizationId)
                        .active(true)
                        .build());
            }
        }

        if (!toSave.isEmpty()) {
            organizationAssignmentRepository.saveAll(toSave);
        }
    }

    private List<UUID> normalizeOrganizationIds(List<UUID> organizationIds) {
        if (organizationIds == null || organizationIds.isEmpty()) {
            return List.of();
        }

        Set<UUID> uniqueIds = new LinkedHashSet<>();
        for (UUID organizationId : organizationIds) {
            if (organizationId == null || !uniqueIds.add(organizationId)) {
                throw new ConflictException(
                        "MASTER_DATA_DUPLICATE_ASSIGNMENT",
                        "error.masterdata.duplicateAssignment",
                        "Duplicate or empty objective organization assignment: " + organizationId,
                        organizationId
                );
            }
        }

        return List.copyOf(uniqueIds);
    }

    private void ensureOrganizations(List<UUID> organizationIds) {
        if (organizationIds.isEmpty()) {
            return;
        }

        Set<UUID> foundIds = organizationRepository.findAllById(organizationIds)
                .stream()
                .map(OrganizationEntity::getId)
                .collect(Collectors.toSet());

        UUID missingId = organizationIds.stream()
                .filter(organizationId -> !foundIds.contains(organizationId))
                .findFirst()
                .orElse(null);

        if (missingId != null) {
            throw new NotFoundException(
                    "MASTER_DATA_NOT_FOUND",
                    "error.masterdata.notFound",
                    "Organization not found: " + missingId,
                    missingId
            );
        }
    }

    private void ensureOrganization(UUID id) {
        if (!organizationRepository.existsById(id)) {
            throw new NotFoundException(
                    "MASTER_DATA_NOT_FOUND",
                    "error.masterdata.notFound",
                    "Organization not found: " + id,
                    id
            );
        }
    }

    private ObjectiveNodeResponse toResponse(ObjectiveNodeEntity entity) {
        return mapper.toResponse(entity, loadOrganizationResponsesByObjectiveId(List.of(entity.getId()))
                .getOrDefault(entity.getId(), List.of()));
    }

    private List<ObjectiveNodeResponse> toResponses(List<ObjectiveNodeEntity> entities) {
        if (entities.isEmpty()) {
            return List.of();
        }

        Map<UUID, List<ObjectiveOrganizationResponse>> organizationsByObjectiveId =
                loadOrganizationResponsesByObjectiveId(
                        entities.stream().map(ObjectiveNodeEntity::getId).toList()
                );

        return entities.stream()
                .map(entity -> mapper.toResponse(
                        entity,
                        organizationsByObjectiveId.getOrDefault(entity.getId(), List.of())
                ))
                .toList();
    }

    private Map<UUID, List<ObjectiveOrganizationResponse>> loadOrganizationResponsesByObjectiveId(
            List<UUID> objectiveIds
    ) {
        if (objectiveIds.isEmpty()) {
            return Map.of();
        }

        List<ObjectiveOrganizationAssignmentEntity> assignments = organizationAssignmentRepository
                .findByObjectiveNodeIdInAndActiveTrueOrderByCreatedAtAsc(objectiveIds);
        if (assignments.isEmpty()) {
            return Map.of();
        }

        Map<UUID, OrganizationEntity> organizationsById = organizationRepository.findAllById(
                        assignments.stream()
                                .map(ObjectiveOrganizationAssignmentEntity::getOrganizationId)
                                .distinct()
                                .toList()
                )
                .stream()
                .collect(Collectors.toMap(OrganizationEntity::getId, Function.identity()));
        Map<UUID, List<ObjectiveOrganizationResponse>> responsesByObjectiveId = new LinkedHashMap<>();

        for (ObjectiveOrganizationAssignmentEntity assignment : assignments) {
            OrganizationEntity organization = organizationsById.get(assignment.getOrganizationId());
            if (organization == null) {
                continue;
            }

            responsesByObjectiveId
                    .computeIfAbsent(assignment.getObjectiveNodeId(), ignored -> new ArrayList<>())
                    .add(new ObjectiveOrganizationResponse(
                            organization.getId(),
                            organization.getCode(),
                            organization.getName(),
                            organization.getStatus().name().toLowerCase(Locale.ROOT)
                    ));
        }

        return responsesByObjectiveId;
    }

    private int compareObjectives(ObjectiveNodeEntity left, ObjectiveNodeEntity right) {
        Comparator<ObjectiveNodeEntity> comparator = Comparator
                .comparing(ObjectiveNodeEntity::getSortOrder, Comparator.nullsLast(Integer::compareTo))
                .thenComparing(ObjectiveNodeEntity::getTitle, Comparator.nullsLast(String::compareToIgnoreCase));

        return comparator.compare(left, right);
    }

    private void validateParent(UUID parentId) {
        if (parentId != null && !repository.existsById(parentId)) {
            throw invalidParent(parentId);
        }
    }

    private void ensureNoCycle(UUID id, UUID parentId) {
        UUID current = parentId;
        while (current != null) {
            ObjectiveNodeEntity node = get(current);
            if (id.equals(node.getId())) {
                throw invalidParent(parentId);
            }
            current = node.getParentId();
        }
    }

    private void validateNodeType(String nodeType) {
        if (!"objective".equals(normalizeRequired(nodeType))) {
            throw invalidParent(null);
        }
    }

    private void validateCode(String code, UUID currentId) {
        String normalized = normalizeRequired(code);
        boolean exists = currentId == null ? repository.existsByCodeIgnoreCase(normalized) : repository.existsByCodeIgnoreCaseAndIdNot(normalized, currentId);
        if (exists) {
            throw new ConflictException("MASTER_DATA_DUPLICATE_CODE", "error.masterdata.duplicateCode", "Duplicate objective code: " + normalized, normalized);
        }
    }

    private ObjectiveNodeEntity get(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Objective node not found: " + id, id));
    }

    private void ensureExists(UUID id) {
        if (!repository.existsById(id)) {
            throw new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Objective node not found: " + id, id);
        }
    }

    private ConflictException invalidParent(UUID parentId) {
        return new ConflictException("MASTER_DATA_INVALID_PARENT", "error.masterdata.invalidParent", "Invalid objective parent: " + parentId, parentId);
    }

    private void audit(String eventName, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        Map<String, Object> safeDetails = new LinkedHashMap<>();
        safeDetails.put("event", eventName);
        safeDetails.putAll(details);
        auditService.log(AuditEventType.MASTER_DATA_CHANGED, AuditTargetType.OBJECTIVE, targetId.toString(), ActionResult.SUCCESS, currentUserProvider.getCurrentUserIdOrNull(), request, safeDetails);
    }
}
