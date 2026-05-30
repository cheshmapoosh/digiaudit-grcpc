package com.digiaudit.grcpc.modules.masterdata.policy.application;

import static com.digiaudit.grcpc.common.util.Dates.*;
import static com.digiaudit.grcpc.common.util.Texts.*;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.masterdata.policy.api.dto.PolicyNodeRequest;
import com.digiaudit.grcpc.modules.masterdata.policy.api.dto.PolicyNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.policy.api.mapper.PolicyMapper;
import com.digiaudit.grcpc.modules.masterdata.policy.domain.entity.PolicyNodeEntity;
import com.digiaudit.grcpc.modules.masterdata.policy.domain.repository.PolicyNodeRepository;
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
public class PolicyService {
    private final PolicyNodeRepository repository;
    private final PolicyMapper mapper;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<PolicyNodeResponse> findAll() {
        return repository.findAllByOrderBySortOrderAscTitleAsc().stream().map(mapper::toResponse).toList();
    }

    public List<PolicyNodeResponse> findAll(String nodeType) {
        String normalizedNodeType = normalizeNullable(nodeType);
        return normalizedNodeType == null ? findAll() : findByNodeType(normalizedNodeType);
    }

    public List<PolicyNodeResponse> findByNodeType(String nodeType) {
        String normalizedNodeType = normalizeRequired(nodeType);
        return repository.findByNodeTypeOrderBySortOrderAscTitleAsc(normalizedNodeType).stream().map(mapper::toResponse).toList();
    }

    public List<PolicyNodeResponse> findRoots() {
        return repository.findByParentIdIsNullOrderBySortOrderAscTitleAsc().stream().map(mapper::toResponse).toList();
    }

    public List<PolicyNodeResponse> findChildren(UUID parentId) {
        ensureExists(parentId);
        return repository.findByParentIdOrderBySortOrderAscTitleAsc(parentId).stream().map(mapper::toResponse).toList();
    }

    public PolicyNodeResponse findById(UUID id) {
        return mapper.toResponse(get(id));
    }

    @Transactional
    public PolicyNodeResponse create(PolicyNodeRequest request, HttpServletRequest httpRequest) {
        validateCode(request.code(), null);
        validateParent(request.parentId(), request.nodeType());
        PolicyNodeEntity saved = repository.save(fill(PolicyNodeEntity.builder().build(), request));
        audit("POLICY_CREATED", saved.getId(), httpRequest, Map.of("code", saved.getCode()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public PolicyNodeResponse update(UUID id, PolicyNodeRequest request, HttpServletRequest httpRequest) {
        PolicyNodeEntity entity = get(id);
        String targetCode = request.code() == null ? entity.getCode() : request.code();
        String targetNodeType = request.nodeType() == null ? entity.getNodeType() : request.nodeType();
        validateCode(targetCode, id);
        if (id.equals(request.parentId())) {
            throw invalidParent(request.parentId());
        }
        validateParent(request.parentId(), targetNodeType);
        ensureNoCycle(id, request.parentId());
        if ("policy".equals(targetNodeType) && repository.existsByParentId(id)) {
            throw invalidParent(id);
        }
        PolicyNodeEntity saved = repository.save(fillUpdate(entity, request));
        audit("POLICY_UPDATED", saved.getId(), httpRequest, Map.of("code", saved.getCode()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public PolicyNodeResponse toggleStatus(UUID id, HttpServletRequest httpRequest) {
        PolicyNodeEntity entity = get(id);
        entity.setStatus("inactive".equals(entity.getStatus()) ? "draft" : "inactive");
        PolicyNodeEntity saved = repository.save(entity);
        audit("POLICY_UPDATED", id, httpRequest, Map.of("status", saved.getStatus()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public void delete(UUID id, HttpServletRequest httpRequest) {
        PolicyNodeEntity entity = get(id);
        if (repository.existsByParentId(id)) {
            throw new ConflictException("MASTER_DATA_HAS_CHILDREN", "error.masterdata.hasChildren", "Policy node has children: " + id);
        }
        repository.delete(entity);
        audit("POLICY_DELETED", id, httpRequest, Map.of("code", entity.getCode()));
    }

    private PolicyNodeEntity fill(PolicyNodeEntity entity, PolicyNodeRequest request) {
        LocalDate validFrom = parseNullable(request.validFrom());
        LocalDate validTo = parseNullable(request.validTo());
        requireValidRange(validFrom, validTo, "Policy validTo cannot be before validFrom");
        entity.setCode(normalizeRequired(request.code()));
        entity.setTitle(normalizeRequired(request.title()));
        entity.setNodeType(normalizeRequired(request.nodeType()));
        entity.setParentId(request.parentId());
        entity.setStatus(normalizeNullable(request.status()) == null ? "draft" : normalizeNullable(request.status()));
        entity.setSortOrder(request.sortOrder());
        entity.setDescription(normalizeNullable(request.description()));
        entity.setPolicyCategory(normalizeNullable(request.policyCategory()));
        entity.setPolicyKind(normalizeNullable(request.policyKind()));
        entity.setOwnerId(request.ownerId());
        entity.setOwnerName(normalizeNullable(request.ownerName()));
        entity.setOwnerOrganization(normalizeNullable(request.ownerOrganization()));
        entity.setCreatorName(normalizeNullable(request.creatorName()));
        entity.setDocumentsCount(request.documentsCount() == null ? 0 : request.documentsCount());
        entity.setPolicyVersion(normalizeNullable(request.version()));
        entity.setValidFrom(validFrom);
        entity.setValidTo(validTo);
        entity.setNextReviewDate(parseNullable(request.nextReviewDate()));
        entity.setCommunicationMethod(normalizeNullable(request.communicationMethod()));
        entity.setCommunicationLanguage(normalizeNullable(request.communicationLanguage()));
        entity.setObjective(normalizeNullable(request.objective()));
        entity.setNote(normalizeNullable(request.note()));
        entity.setEvaluationConfirmed(request.evaluationConfirmed());
        return entity;
    }

    private PolicyNodeEntity fillUpdate(PolicyNodeEntity entity, PolicyNodeRequest request) {
        LocalDate validFrom = request.validFrom() == null ? entity.getValidFrom() : parseNullable(request.validFrom());
        LocalDate validTo = request.validTo() == null ? entity.getValidTo() : parseNullable(request.validTo());
        requireValidRange(validFrom, validTo, "Policy validTo cannot be before validFrom");

        if (request.code() != null) {
            entity.setCode(normalizeRequired(request.code()));
        }
        if (request.title() != null) {
            entity.setTitle(normalizeRequired(request.title()));
        }
        if (request.nodeType() != null) {
            entity.setNodeType(normalizeRequired(request.nodeType()));
        }
        entity.setParentId(request.parentId());
        if (request.status() != null) {
            entity.setStatus(normalizeNullable(request.status()) == null ? "draft" : normalizeNullable(request.status()));
        }
        if (request.sortOrder() != null) {
            entity.setSortOrder(request.sortOrder());
        }
        if (request.description() != null) {
            entity.setDescription(normalizeNullable(request.description()));
        }
        if (request.policyCategory() != null) {
            entity.setPolicyCategory(normalizeNullable(request.policyCategory()));
        }
        if (request.policyKind() != null) {
            entity.setPolicyKind(normalizeNullable(request.policyKind()));
        }
        if (request.ownerId() != null) {
            entity.setOwnerId(request.ownerId());
        }
        if (request.ownerName() != null) {
            entity.setOwnerName(normalizeNullable(request.ownerName()));
        }
        if (request.ownerOrganization() != null) {
            entity.setOwnerOrganization(normalizeNullable(request.ownerOrganization()));
        }
        if (request.creatorName() != null) {
            entity.setCreatorName(normalizeNullable(request.creatorName()));
        }
        if (request.documentsCount() != null) {
            entity.setDocumentsCount(request.documentsCount());
        }
        if (request.version() != null) {
            entity.setPolicyVersion(normalizeNullable(request.version()));
        }
        if (request.validFrom() != null) {
            entity.setValidFrom(validFrom);
        }
        if (request.validTo() != null) {
            entity.setValidTo(validTo);
        }
        if (request.nextReviewDate() != null) {
            entity.setNextReviewDate(parseNullable(request.nextReviewDate()));
        }
        if (request.communicationMethod() != null) {
            entity.setCommunicationMethod(normalizeNullable(request.communicationMethod()));
        }
        if (request.communicationLanguage() != null) {
            entity.setCommunicationLanguage(normalizeNullable(request.communicationLanguage()));
        }
        if (request.objective() != null) {
            entity.setObjective(normalizeNullable(request.objective()));
        }
        if (request.note() != null) {
            entity.setNote(normalizeNullable(request.note()));
        }
        if (request.evaluationConfirmed() != null) {
            entity.setEvaluationConfirmed(request.evaluationConfirmed());
        }
        return entity;
    }

    private void validateParent(UUID parentId, String nodeType) {
        String normalizedNodeType = normalizeRequired(nodeType);
        if (parentId == null) {
            if ("policyGroup".equals(normalizedNodeType)) {
                return;
            }
            throw invalidParent(parentId);
        }
        PolicyNodeEntity parent = repository.findById(parentId).orElseThrow(() -> invalidParent(parentId));

        boolean valid = "policyGroup".equals(parent.getNodeType())
                && ("policyGroup".equals(normalizedNodeType) || "policy".equals(normalizedNodeType));
        if (!valid) {
            throw invalidParent(parentId);
        }
    }

    private void ensureNoCycle(UUID id, UUID parentId) {
        UUID current = parentId;
        while (current != null) {
            PolicyNodeEntity node = get(current);
            if (id.equals(node.getId())) {
                throw invalidParent(parentId);
            }
            current = node.getParentId();
        }
    }

    private void validateCode(String code, UUID currentId) {
        String normalized = normalizeRequired(code);
        boolean exists = currentId == null ? repository.existsByCodeIgnoreCase(normalized) : repository.existsByCodeIgnoreCaseAndIdNot(normalized, currentId);
        if (exists) {
            throw new ConflictException("MASTER_DATA_DUPLICATE_CODE", "error.masterdata.duplicateCode", "Duplicate policy code: " + normalized, normalized);
        }
    }

    private PolicyNodeEntity get(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Policy node not found: " + id, id));
    }

    private void ensureExists(UUID id) {
        if (!repository.existsById(id)) {
            throw new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Policy node not found: " + id, id);
        }
    }

    private ConflictException invalidParent(UUID parentId) {
        return new ConflictException("MASTER_DATA_INVALID_PARENT", "error.masterdata.invalidParent", "Invalid policy parent: " + parentId, parentId);
    }

    private void audit(String eventName, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        Map<String, Object> safeDetails = new LinkedHashMap<>();
        safeDetails.put("event", eventName);
        safeDetails.putAll(details);
        auditService.log(AuditEventType.MASTER_DATA_CHANGED, AuditTargetType.POLICY, targetId.toString(), ActionResult.SUCCESS, currentUserProvider.getCurrentUserIdOrNull(), request, safeDetails);
    }
}
