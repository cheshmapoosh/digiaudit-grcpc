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
import com.digiaudit.grcpc.modules.masterdata.objective.api.mapper.ObjectiveMapper;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.entity.ObjectiveNodeEntity;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.repository.ObjectiveNodeRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.*;
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
    private final ObjectiveMapper mapper;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<ObjectiveNodeResponse> findAll() {
        return repository.findAllByOrderBySortOrderAscTitleAsc().stream().map(mapper::toResponse).toList();
    }

    public List<ObjectiveNodeResponse> findRoots() {
        return repository.findByParentIdIsNullOrderBySortOrderAscTitleAsc().stream().map(mapper::toResponse).toList();
    }

    public List<ObjectiveNodeResponse> findChildren(UUID parentId) {
        ensureExists(parentId);
        return repository.findByParentIdOrderBySortOrderAscTitleAsc(parentId).stream().map(mapper::toResponse).toList();
    }

    public ObjectiveNodeResponse findById(UUID id) {
        return mapper.toResponse(get(id));
    }

    @Transactional
    public ObjectiveNodeResponse create(ObjectiveNodeRequest request, HttpServletRequest httpRequest) {
        validateCode(request.code(), null);
        validateParent(request.parentId());
        ObjectiveNodeEntity saved = repository.save(fill(ObjectiveNodeEntity.builder().build(), request));
        audit("OBJECTIVE_CREATED", saved.getId(), httpRequest, Map.of("code", saved.getCode()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public ObjectiveNodeResponse update(UUID id, ObjectiveNodeRequest request, HttpServletRequest httpRequest) {
        ObjectiveNodeEntity entity = get(id);
        validateCode(request.code(), id);
        if (id.equals(request.parentId())) {
            throw invalidParent(request.parentId());
        }
        validateParent(request.parentId());
        ObjectiveNodeEntity saved = repository.save(fill(entity, request));
        audit("OBJECTIVE_UPDATED", saved.getId(), httpRequest, Map.of("code", saved.getCode()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public ObjectiveNodeResponse toggleStatus(UUID id, HttpServletRequest httpRequest) {
        ObjectiveNodeEntity entity = get(id);
        entity.setStatus(toggleActiveInactive(entity.getStatus()));
        ObjectiveNodeEntity saved = repository.save(entity);
        audit("OBJECTIVE_UPDATED", id, httpRequest, Map.of("status", saved.getStatus()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public void delete(UUID id, HttpServletRequest httpRequest) {
        ObjectiveNodeEntity entity = get(id);
        if (repository.existsByParentId(id)) {
            throw new ConflictException("MASTER_DATA_HAS_CHILDREN", "error.masterdata.hasChildren", "Objective node has children: " + id);
        }
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

    private void validateParent(UUID parentId) {
        if (parentId != null && !repository.existsById(parentId)) {
            throw invalidParent(parentId);
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
