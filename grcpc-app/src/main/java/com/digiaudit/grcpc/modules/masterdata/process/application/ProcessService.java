package com.digiaudit.grcpc.modules.masterdata.process.application;

import static com.digiaudit.grcpc.common.util.Texts.normalizeNullable;
import static com.digiaudit.grcpc.common.util.Texts.normalizeRequired;
import static com.digiaudit.grcpc.common.util.Texts.toggleActiveInactive;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessNodeRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.process.api.mapper.ProcessMapper;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessNodeEntity;
import com.digiaudit.grcpc.modules.masterdata.control.domain.repository.ControlAssignmentRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessAccountGroupAssignmentRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessNodeRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessObjectiveAssignmentRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessRegulationAssignmentRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessRiskAssignmentRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProcessService {

    private static final Set<String> PROCESS_NODE_TYPES = Set.of("process", "subProcess");

    private final ProcessNodeRepository processNodeRepository;
    private final ControlAssignmentRepository controlAssignmentRepository;
    private final ProcessObjectiveAssignmentRepository objectiveAssignmentRepository;
    private final ProcessAccountGroupAssignmentRepository accountGroupAssignmentRepository;
    private final ProcessRiskAssignmentRepository riskAssignmentRepository;
    private final ProcessRegulationAssignmentRepository regulationAssignmentRepository;
    private final ProcessMapper mapper;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<ProcessNodeResponse> findAll() {
        log.debug("Finding all process nodes");
        return processNodeRepository.findAllByOrderBySortOrderAscTitleAsc()
                .stream()
                .map(mapper::toResponse)
                .sorted(this::compare)
                .toList();
    }

    public List<ProcessNodeResponse> findRoots() {
        return processNodeRepository.findByParentIdIsNullOrderBySortOrderAscTitleAsc()
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    public List<ProcessNodeResponse> findChildren(UUID parentId) {
        ensureProcessNodeExists(parentId);
        return processNodeRepository.findByParentIdOrderBySortOrderAscTitleAsc(parentId)
                .stream()
                .map(mapper::toResponse)
                .sorted(this::compare)
                .toList();
    }

    public ProcessNodeResponse findById(UUID id) {
        return mapper.toResponse(ensureProcessNode(id));
    }

    @Transactional
    public ProcessNodeResponse create(ProcessNodeRequest request, HttpServletRequest httpRequest) {
        validateNodeType(request.nodeType());
        validateProcessCode(request.code(), null);
        validateParent(request.parentId(), request.nodeType());

        ProcessNodeEntity entity = ProcessNodeEntity.builder()
                .code(normalizeRequired(request.code()))
                .title(normalizeRequired(request.title()))
                .nodeType(normalizeRequired(request.nodeType()))
                .parentId(request.parentId())
                .status(normalizeStatus(request.status()))
                .sortOrder(request.sortOrder())
                .description(normalizeNullable(request.description()))
                .processCategory(normalizeNullable(request.processCategory()))
                .ownerId(request.ownerId())
                .ownerName(normalizeNullable(request.ownerName()))
                .documentsCount(defaultZero(request.documentsCount()))
                .objective(normalizeNullable(request.objective()))
                .operationCycle(normalizeNullable(request.operationCycle()))
                .build();

        ProcessNodeEntity saved = processNodeRepository.save(entity);
        audit("PROCESS_CREATED", saved.getId(), httpRequest, Map.of("code", saved.getCode()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public ProcessNodeResponse update(UUID id, ProcessNodeRequest request, HttpServletRequest httpRequest) {
        ProcessNodeEntity entity = ensureProcessNode(id);
        validateProcessCode(request.code(), entity.getId());
        validateParentForUpdate(entity.getId(), request.parentId(), request.nodeType());

        entity.setCode(normalizeRequired(request.code()));
        entity.setTitle(normalizeRequired(request.title()));
        entity.setNodeType(normalizeRequired(request.nodeType()));
        entity.setParentId(request.parentId());
        entity.setStatus(normalizeStatus(request.status()));
        entity.setSortOrder(request.sortOrder());
        entity.setDescription(normalizeNullable(request.description()));
        entity.setProcessCategory(normalizeNullable(request.processCategory()));
        entity.setOwnerId(request.ownerId());
        entity.setOwnerName(normalizeNullable(request.ownerName()));
        entity.setDocumentsCount(defaultZero(request.documentsCount()));
        entity.setObjective(normalizeNullable(request.objective()));
        entity.setOperationCycle(normalizeNullable(request.operationCycle()));

        ProcessNodeEntity saved = processNodeRepository.save(entity);
        audit("PROCESS_UPDATED", saved.getId(), httpRequest, Map.of("code", saved.getCode()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public ProcessNodeResponse toggleStatus(UUID id, HttpServletRequest httpRequest) {
        ProcessNodeEntity entity = ensureProcessNode(id);
        entity.setStatus(toggleActiveInactive(entity.getStatus()));
        ProcessNodeEntity saved = processNodeRepository.save(entity);
        audit("PROCESS_UPDATED", saved.getId(), httpRequest, Map.of("status", saved.getStatus()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public void delete(UUID id, HttpServletRequest httpRequest) {
        ProcessNodeEntity entity = ensureProcessNode(id);
        if (processNodeRepository.existsByParentId(id)
                || controlAssignmentRepository.existsBySubProcessId(id)
                || objectiveAssignmentRepository.existsByProcessNodeId(id)
                || accountGroupAssignmentRepository.existsByProcessNodeId(id)
                || riskAssignmentRepository.existsByProcessNodeId(id)
                || regulationAssignmentRepository.existsByProcessNodeId(id)) {
            throw new ConflictException("MASTER_DATA_HAS_CHILDREN", "error.masterdata.hasChildren", "Process node has children or assignments: " + id);
        }

        processNodeRepository.delete(entity);
        audit("PROCESS_DELETED", id, httpRequest, Map.of("code", entity.getCode()));
    }

    private void validateNodeType(String nodeType) {
        if (!PROCESS_NODE_TYPES.contains(nodeType)) {
            throw new ConflictException("MASTER_DATA_INVALID_PARENT", "error.masterdata.invalidParent", "Invalid process node type: " + nodeType);
        }
    }

    private void validateParent(UUID parentId, String nodeType) {
        if ("process".equals(nodeType) && parentId == null) {
            return;
        }
        if (parentId == null) {
            throw new ConflictException("MASTER_DATA_INVALID_PARENT", "error.masterdata.invalidParent", "Sub process requires a process parent");
        }
        ProcessNodeEntity parent = processNodeRepository.findById(parentId).orElseThrow(() -> invalidParent(parentId));
        if ("subProcess".equals(nodeType) && !"process".equals(parent.getNodeType())) {
            throw invalidParent(parentId);
        }
    }

    private void validateParentForUpdate(UUID id, UUID parentId, String nodeType) {
        validateNodeType(nodeType);
        if (id.equals(parentId)) {
            throw invalidParent(parentId);
        }
        validateParent(parentId, nodeType);
    }

    private void validateProcessCode(String code, UUID currentId) {
        String normalized = normalizeRequired(code);
        boolean exists = currentId == null
                ? processNodeRepository.existsByCodeIgnoreCase(normalized)
                : processNodeRepository.existsByCodeIgnoreCaseAndIdNot(normalized, currentId);
        if (exists) {
            throw duplicateCode(normalized);
        }
    }

    private void ensureProcessNodeExists(UUID id) {
        if (!processNodeRepository.existsById(id)) {
            throw notFound(id);
        }
    }

    private ProcessNodeEntity ensureProcessNode(UUID id) {
        return processNodeRepository.findById(id).orElseThrow(() -> notFound(id));
    }

    private int compare(ProcessNodeResponse left, ProcessNodeResponse right) {
        int parent = Comparator.nullsFirst(UUID::compareTo).compare(left.parentId(), right.parentId());
        if (parent != 0) {
            return parent;
        }
        int sort = Comparator.nullsLast(Integer::compareTo).compare(left.sortOrder(), right.sortOrder());
        if (sort != 0) {
            return sort;
        }
        return String.CASE_INSENSITIVE_ORDER.compare(left.title(), right.title());
    }

    private String normalizeStatus(String status) {
        String normalized = normalizeNullable(status);
        return normalized == null ? "active" : normalized;
    }

    private int defaultZero(Integer value) {
        return value == null ? 0 : value;
    }

    private NotFoundException notFound(UUID id) {
        return new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Process node not found: " + id, id);
    }

    private ConflictException duplicateCode(String code) {
        return new ConflictException("MASTER_DATA_DUPLICATE_CODE", "error.masterdata.duplicateCode", "Duplicate process code: " + code, code);
    }

    private ConflictException invalidParent(UUID parentId) {
        return new ConflictException("MASTER_DATA_INVALID_PARENT", "error.masterdata.invalidParent", "Invalid process parent: " + parentId, parentId);
    }

    private void audit(String eventName, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        auditService.log(
                AuditEventType.MASTER_DATA_CHANGED,
                AuditTargetType.PROCESS,
                targetId.toString(),
                ActionResult.SUCCESS,
                currentUserProvider.getCurrentUserIdOrNull(),
                request,
                new LinkedHashMap<>() {{
                    put("event", eventName);
                    putAll(details);
                }}
        );
    }
}
