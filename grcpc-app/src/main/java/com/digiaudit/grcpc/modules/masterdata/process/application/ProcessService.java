package com.digiaudit.grcpc.modules.masterdata.process.application;

import static com.digiaudit.grcpc.common.util.Texts.*;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessNodeRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.process.api.mapper.ProcessMapper;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ControlEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessControlAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessNodeEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ControlRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessControlAssignmentRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessNodeRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessObjectiveAssignmentRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
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
    private final ControlRepository controlRepository;
    private final ProcessControlAssignmentRepository assignmentRepository;
    private final ProcessObjectiveAssignmentRepository objectiveAssignmentRepository;
    private final ProcessMapper mapper;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<ProcessNodeResponse> findAll() {
        log.debug("Finding all process nodes and controls");
        List<ProcessNodeResponse> result = new ArrayList<>();
        processNodeRepository.findAllByOrderBySortOrderAscTitleAsc().forEach(item -> result.add(mapper.toResponse(item)));
        controlRepository.findAllByOrderBySortOrderAscTitleAsc().forEach(control -> result.add(toControlResponse(control)));
        return result.stream().sorted(this::compare).toList();
    }

    public List<ProcessNodeResponse> findRoots() {
        return processNodeRepository.findByParentIdIsNullOrderBySortOrderAscTitleAsc()
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    public List<ProcessNodeResponse> findChildren(UUID parentId) {
        ensureProcessNodeExists(parentId);
        List<ProcessNodeResponse> result = new ArrayList<>();
        processNodeRepository.findByParentIdOrderBySortOrderAscTitleAsc(parentId).forEach(item -> result.add(mapper.toResponse(item)));
        List<UUID> controlIds = assignmentRepository.findByProcessNodeIdAndActiveTrue(parentId)
                .stream()
                .map(ProcessControlAssignmentEntity::getControlId)
                .toList();
        controlRepository.findAllById(controlIds).forEach(control -> result.add(mapper.toControlResponse(control, parentId)));
        return result.stream().sorted(this::compare).toList();
    }

    public ProcessNodeResponse findById(UUID id) {
        return processNodeRepository.findById(id)
                .map(mapper::toResponse)
                .or(() -> controlRepository.findById(id).map(this::toControlResponse))
                .orElseThrow(() -> notFound(id));
    }

    @Transactional
    public ProcessNodeResponse create(ProcessNodeRequest request, HttpServletRequest httpRequest) {
        if ("control".equals(request.nodeType())) {
            return createControl(request, httpRequest);
        }
        return createProcessNode(request, httpRequest);
    }

    @Transactional
    public ProcessNodeResponse update(UUID id, ProcessNodeRequest request, HttpServletRequest httpRequest) {
        Optional<ProcessNodeEntity> processNode = processNodeRepository.findById(id);
        if (processNode.isPresent()) {
            return updateProcessNode(processNode.get(), request, httpRequest);
        }
        ControlEntity control = controlRepository.findById(id).orElseThrow(() -> notFound(id));
        return updateControl(control, request, httpRequest);
    }

    @Transactional
    public ProcessNodeResponse toggleStatus(UUID id, HttpServletRequest httpRequest) {
        Optional<ProcessNodeEntity> processNode = processNodeRepository.findById(id);
        if (processNode.isPresent()) {
            ProcessNodeEntity entity = processNode.get();
            entity.setStatus(toggleActiveInactive(entity.getStatus()));
            ProcessNodeEntity saved = processNodeRepository.save(entity);
            audit("PROCESS_UPDATED", AuditTargetType.PROCESS, saved.getId(), httpRequest, Map.of("status", saved.getStatus()));
            return mapper.toResponse(saved);
        }
        ControlEntity control = controlRepository.findById(id).orElseThrow(() -> notFound(id));
        control.setStatus(toggleActiveInactive(control.getStatus()));
        ControlEntity saved = controlRepository.save(control);
        audit("CONTROL_UPDATED", AuditTargetType.CONTROL, saved.getId(), httpRequest, Map.of("status", saved.getStatus()));
        return toControlResponse(saved);
    }

    @Transactional
    public void delete(UUID id, HttpServletRequest httpRequest) {
        Optional<ProcessNodeEntity> processNode = processNodeRepository.findById(id);
        if (processNode.isPresent()) {
            ProcessNodeEntity entity = processNode.get();
            if (processNodeRepository.existsByParentId(id)
                    || assignmentRepository.existsByProcessNodeId(id)
                    || objectiveAssignmentRepository.existsByProcessNodeId(id)) {
                throw new ConflictException("MASTER_DATA_HAS_CHILDREN", "error.masterdata.hasChildren", "Process node has children, controls, or assignments: " + id);
            }
            processNodeRepository.delete(entity);
            audit("PROCESS_DELETED", AuditTargetType.PROCESS, id, httpRequest, Map.of("code", entity.getCode()));
            return;
        }
        ControlEntity control = controlRepository.findById(id).orElseThrow(() -> notFound(id));
        assignmentRepository.deleteByControlId(id);
        controlRepository.delete(control);
        audit("CONTROL_DELETED", AuditTargetType.CONTROL, id, httpRequest, Map.of("code", control.getCode()));
    }

    private ProcessNodeResponse createProcessNode(ProcessNodeRequest request, HttpServletRequest httpRequest) {
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
        audit("PROCESS_CREATED", AuditTargetType.PROCESS, saved.getId(), httpRequest, Map.of("code", saved.getCode()));
        return mapper.toResponse(saved);
    }

    private ProcessNodeResponse updateProcessNode(ProcessNodeEntity entity, ProcessNodeRequest request, HttpServletRequest httpRequest) {
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
        audit("PROCESS_UPDATED", AuditTargetType.PROCESS, saved.getId(), httpRequest, Map.of("code", saved.getCode()));
        return mapper.toResponse(saved);
    }

    private ProcessNodeResponse createControl(ProcessNodeRequest request, HttpServletRequest httpRequest) {
        validateControlCode(request.code(), null);
        validateControlParent(request.parentId());
        ControlEntity entity = ControlEntity.builder()
                .code(normalizeRequired(request.code()))
                .title(normalizeRequired(request.title()))
                .status(normalizeStatus(request.status()))
                .sortOrder(request.sortOrder())
                .description(normalizeNullable(request.description()))
                .ownerId(request.ownerId())
                .ownerName(normalizeNullable(request.ownerName()))
                .documentsCount(defaultZero(request.documentsCount()))
                .controlAutomation(normalizeNullable(request.controlAutomation()))
                .controlFrequency(normalizeNullable(request.controlFrequency()))
                .controlClassification(normalizeNullable(request.controlClassification()))
                .controlOwner(normalizeNullable(request.controlOwner()))
                .testDirection(normalizeNullable(request.testDirection()))
                .testType(normalizeNullable(request.testType()))
                .testProgram(normalizeNullable(request.testProgram()))
                .importance(normalizeNullable(request.importance()))
                .build();
        ControlEntity saved = controlRepository.save(entity);
        assignmentRepository.save(ProcessControlAssignmentEntity.builder()
                .processNodeId(request.parentId())
                .controlId(saved.getId())
                .assignmentType("scope")
                .active(true)
                .build());
        audit("CONTROL_CREATED", AuditTargetType.CONTROL, saved.getId(), httpRequest, Map.of("code", saved.getCode(), "parentId", request.parentId()));
        return mapper.toControlResponse(saved, request.parentId());
    }

    private ProcessNodeResponse updateControl(ControlEntity entity, ProcessNodeRequest request, HttpServletRequest httpRequest) {
        validateControlCode(request.code(), entity.getId());
        validateControlParent(request.parentId());
        entity.setCode(normalizeRequired(request.code()));
        entity.setTitle(normalizeRequired(request.title()));
        entity.setStatus(normalizeStatus(request.status()));
        entity.setSortOrder(request.sortOrder());
        entity.setDescription(normalizeNullable(request.description()));
        entity.setOwnerId(request.ownerId());
        entity.setOwnerName(normalizeNullable(request.ownerName()));
        entity.setDocumentsCount(defaultZero(request.documentsCount()));
        entity.setControlAutomation(normalizeNullable(request.controlAutomation()));
        entity.setControlFrequency(normalizeNullable(request.controlFrequency()));
        entity.setControlClassification(normalizeNullable(request.controlClassification()));
        entity.setControlOwner(normalizeNullable(request.controlOwner()));
        entity.setTestDirection(normalizeNullable(request.testDirection()));
        entity.setTestType(normalizeNullable(request.testType()));
        entity.setTestProgram(normalizeNullable(request.testProgram()));
        entity.setImportance(normalizeNullable(request.importance()));
        ControlEntity saved = controlRepository.save(entity);
        assignmentRepository.findFirstByControlIdAndActiveTrueOrderByCreatedAtAsc(saved.getId())
                .ifPresentOrElse(assignment -> {
                    assignment.setProcessNodeId(request.parentId());
                    assignmentRepository.save(assignment);
                }, () -> assignmentRepository.save(ProcessControlAssignmentEntity.builder()
                        .processNodeId(request.parentId())
                        .controlId(saved.getId())
                        .assignmentType("scope")
                        .active(true)
                        .build()));
        audit("CONTROL_UPDATED", AuditTargetType.CONTROL, saved.getId(), httpRequest, Map.of("code", saved.getCode(), "parentId", request.parentId()));
        return mapper.toControlResponse(saved, request.parentId());
    }

    private ProcessNodeResponse toControlResponse(ControlEntity control) {
        UUID parentId = assignmentRepository.findFirstByControlIdAndActiveTrueOrderByCreatedAtAsc(control.getId())
                .map(ProcessControlAssignmentEntity::getProcessNodeId)
                .orElse(null);
        return mapper.toControlResponse(control, parentId);
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

    private void validateControlParent(UUID parentId) {
        if (parentId == null) {
            throw invalidParent(parentId);
        }
        ProcessNodeEntity parent = processNodeRepository.findById(parentId).orElseThrow(() -> invalidParent(parentId));
        if (!"subProcess".equals(parent.getNodeType())) {
            throw invalidParent(parentId);
        }
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

    private void validateControlCode(String code, UUID currentId) {
        String normalized = normalizeRequired(code);
        boolean exists = currentId == null
                ? controlRepository.existsByCodeIgnoreCase(normalized)
                : controlRepository.existsByCodeIgnoreCaseAndIdNot(normalized, currentId);
        if (exists) {
            throw duplicateCode(normalized);
        }
    }

    private void ensureProcessNodeExists(UUID id) {
        if (!processNodeRepository.existsById(id)) {
            throw notFound(id);
        }
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
        return new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Process/control not found: " + id, id);
    }

    private ConflictException duplicateCode(String code) {
        return new ConflictException("MASTER_DATA_DUPLICATE_CODE", "error.masterdata.duplicateCode", "Duplicate process/control code: " + code, code);
    }

    private ConflictException invalidParent(UUID parentId) {
        return new ConflictException("MASTER_DATA_INVALID_PARENT", "error.masterdata.invalidParent", "Invalid process parent: " + parentId, parentId);
    }

    private void audit(String eventName, AuditTargetType targetType, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        auditService.log(
                AuditEventType.MASTER_DATA_CHANGED,
                targetType,
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
