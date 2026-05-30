package com.digiaudit.grcpc.modules.masterdata.risk.application;

import static com.digiaudit.grcpc.common.util.Dates.*;
import static com.digiaudit.grcpc.common.util.Texts.*;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.masterdata.risk.api.dto.RiskNodeRequest;
import com.digiaudit.grcpc.modules.masterdata.risk.api.dto.RiskNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.risk.api.mapper.RiskMapper;
import com.digiaudit.grcpc.modules.masterdata.risk.domain.entity.RiskNodeEntity;
import com.digiaudit.grcpc.modules.masterdata.risk.domain.repository.RiskNodeRepository;
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
public class RiskService {

    private final RiskNodeRepository repository;
    private final RiskMapper mapper;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<RiskNodeResponse> findAll() {
        return repository.findAllByOrderBySortOrderAscTitleAsc().stream().map(mapper::toResponse).toList();
    }

    public List<RiskNodeResponse> findRoots() {
        return repository.findByParentIdIsNullOrderBySortOrderAscTitleAsc().stream().map(mapper::toResponse).toList();
    }

    public List<RiskNodeResponse> findChildren(UUID parentId) {
        ensureExists(parentId);
        return repository.findByParentIdOrderBySortOrderAscTitleAsc(parentId).stream().map(mapper::toResponse).toList();
    }

    public RiskNodeResponse findById(UUID id) {
        return mapper.toResponse(get(id));
    }

    @Transactional
    public RiskNodeResponse create(RiskNodeRequest request, HttpServletRequest httpRequest) {
        validateCode(request.code(), null);
        validateParent(request.parentId(), request.nodeType());
        RiskNodeEntity saved = repository.save(fill(RiskNodeEntity.builder().build(), request));
        audit("RISK_CREATED", saved.getId(), httpRequest, Map.of("code", saved.getCode()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public RiskNodeResponse update(UUID id, RiskNodeRequest request, HttpServletRequest httpRequest) {
        RiskNodeEntity entity = get(id);
        validateCode(request.code(), id);
        validateParentForUpdate(id, request.parentId(), request.nodeType());
        RiskNodeEntity saved = repository.save(fill(entity, request));
        audit("RISK_UPDATED", saved.getId(), httpRequest, Map.of("code", saved.getCode()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public RiskNodeResponse toggleStatus(UUID id, HttpServletRequest httpRequest) {
        RiskNodeEntity entity = get(id);
        entity.setStatus(toggleActiveInactive(entity.getStatus()));
        RiskNodeEntity saved = repository.save(entity);
        audit("RISK_UPDATED", id, httpRequest, Map.of("status", saved.getStatus()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public void delete(UUID id, HttpServletRequest httpRequest) {
        RiskNodeEntity entity = get(id);
        if (repository.existsByParentId(id)) {
            throw new ConflictException("MASTER_DATA_HAS_CHILDREN", "error.masterdata.hasChildren", "Risk node has children: " + id);
        }
        repository.delete(entity);
        audit("RISK_DELETED", id, httpRequest, Map.of("code", entity.getCode()));
    }

    private RiskNodeEntity fill(RiskNodeEntity entity, RiskNodeRequest request) {
        LocalDate validFrom = parseNullable(request.validFrom());
        LocalDate validTo = parseNullable(request.validTo());
        requireValidRange(validFrom, validTo, "Risk validTo cannot be before validFrom");
        entity.setCode(normalizeRequired(request.code()));
        entity.setTitle(normalizeRequired(request.title()));
        entity.setNodeType(normalizeRequired(request.nodeType()));
        entity.setParentId(request.parentId());
        entity.setStatus(normalizeNullable(request.status()) == null ? "active" : normalizeNullable(request.status()));
        entity.setSortOrder(request.sortOrder());
        entity.setDescription(normalizeNullable(request.description()));
        entity.setValidFrom(validFrom);
        entity.setValidTo(validTo);
        entity.setAllowReference(request.allowReference());
        entity.setAnalysisProfile(normalizeNullable(request.analysisProfile()));
        entity.setOwnerId(request.ownerId());
        entity.setOwnerName(normalizeNullable(request.ownerName()));
        entity.setDocumentsCount(defaultZero(request.documentsCount()));
        entity.setCompanyOperation(normalizeNullable(request.companyOperation()));
        entity.setRiskType(normalizeNullable(request.riskType()));
        entity.setCauses(normalizeNullable(request.causes()));
        entity.setEffects(request.effects() == null ? List.of() : request.effects());
        entity.setExistingRisksCount(defaultZero(request.existingRisksCount()));
        entity.setResponsePatternsCount(defaultZero(request.responsePatternsCount()));
        entity.setControlCentersCount(defaultZero(request.controlCentersCount()));
        return entity;
    }

    private void validateParent(UUID parentId, String nodeType) {
        if ("riskCategory".equals(nodeType) && parentId == null) {
            return;
        }
        if (parentId == null) {
            throw invalidParent(parentId);
        }
        RiskNodeEntity parent = repository.findById(parentId).orElseThrow(() -> invalidParent(parentId));
        if ("riskTemplate".equals(nodeType) && !"riskCategory".equals(parent.getNodeType())) {
            throw invalidParent(parentId);
        }
    }

    private void validateParentForUpdate(UUID id, UUID parentId, String nodeType) {
        if (id.equals(parentId)) {
            throw invalidParent(parentId);
        }
        validateParent(parentId, nodeType);
    }

    private void validateCode(String code, UUID currentId) {
        String normalized = normalizeRequired(code);
        boolean exists = currentId == null ? repository.existsByCodeIgnoreCase(normalized) : repository.existsByCodeIgnoreCaseAndIdNot(normalized, currentId);
        if (exists) {
            throw new ConflictException("MASTER_DATA_DUPLICATE_CODE", "error.masterdata.duplicateCode", "Duplicate risk code: " + normalized, normalized);
        }
    }

    private RiskNodeEntity get(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Risk node not found: " + id, id));
    }

    private void ensureExists(UUID id) {
        if (!repository.existsById(id)) {
            throw new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Risk node not found: " + id, id);
        }
    }

    private ConflictException invalidParent(UUID parentId) {
        return new ConflictException("MASTER_DATA_INVALID_PARENT", "error.masterdata.invalidParent", "Invalid risk parent: " + parentId, parentId);
    }

    private int defaultZero(Integer value) {
        return value == null ? 0 : value;
    }

    private void audit(String eventName, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        Map<String, Object> safeDetails = new LinkedHashMap<>();
        safeDetails.put("event", eventName);
        safeDetails.putAll(details);
        auditService.log(AuditEventType.MASTER_DATA_CHANGED, AuditTargetType.RISK, targetId.toString(), ActionResult.SUCCESS, currentUserProvider.getCurrentUserIdOrNull(), request, safeDetails);
    }
}
