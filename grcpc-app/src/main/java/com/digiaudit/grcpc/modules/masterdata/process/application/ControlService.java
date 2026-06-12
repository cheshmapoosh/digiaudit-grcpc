package com.digiaudit.grcpc.modules.masterdata.process.application;

import static com.digiaudit.grcpc.common.util.Dates.requireValidRange;
import static com.digiaudit.grcpc.common.util.Texts.normalizeNullable;
import static com.digiaudit.grcpc.common.util.Texts.normalizeRequired;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.AttachExistingControlRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ControlDetailsDto;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ControlStructureNodeDto;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ControlSummaryDto;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CreateControlAndAssignRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.MoveControlAssignmentRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.UpdateControlAssignmentRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.mapper.ControlMapper;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ControlAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ControlEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessNodeEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.enums.ControlAssignmentStatus;
import com.digiaudit.grcpc.modules.masterdata.process.domain.enums.ControlStatus;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ControlAssignmentRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ControlRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessNodeRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
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
public class ControlService {

    private static final String NODE_TYPE_PROCESS = "process";
    private static final String NODE_TYPE_SUB_PROCESS = "subProcess";
    private static final String NODE_TYPE_CONTROL = "control";

    private final ControlRepository controlRepository;
    private final ControlAssignmentRepository assignmentRepository;
    private final ProcessNodeRepository processNodeRepository;
    private final ControlMapper mapper;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<ControlSummaryDto> listControls() {
        return controlRepository.findAllByOrderByCodeAscNameAsc()
                .stream()
                .map(mapper::toSummary)
                .toList();
    }

    public ControlSummaryDto getControl(UUID controlId) {
        return mapper.toSummary(ensureControl(controlId));
    }

    public List<ControlStructureNodeDto> getControlStructure() {
        List<ProcessNodeEntity> processNodes = processNodeRepository.findAllByOrderBySortOrderAscTitleAsc();
        Map<UUID, ProcessNodeEntity> processNodesById = processNodes.stream()
                .collect(Collectors.toMap(ProcessNodeEntity::getId, Function.identity()));

        List<ControlAssignmentEntity> assignments =
                assignmentRepository.findByAssignmentStatusOrderBySortOrderAscCreatedAtAsc(ControlAssignmentStatus.active);
        Map<UUID, ControlEntity> controlsById = controlRepository.findAllById(
                        assignments.stream().map(ControlAssignmentEntity::getControlId).distinct().toList()
                )
                .stream()
                .collect(Collectors.toMap(ControlEntity::getId, Function.identity()));

        List<ControlStructureNodeDto> result = new ArrayList<>();
        processNodes.forEach(processNode -> result.add(toProcessStructureNode(processNode)));
        assignments.stream()
                .map(assignment -> toControlStructureNode(assignment, controlsById.get(assignment.getControlId()), processNodesById))
                .filter(Objects::nonNull)
                .forEach(result::add);

        return result.stream()
                .sorted(this::compareStructureNodes)
                .toList();
    }

    @Transactional
    public ControlDetailsDto createAndAssign(
            UUID subProcessId,
            CreateControlAndAssignRequest request,
            HttpServletRequest httpRequest
    ) {
        ProcessNodeEntity subProcess = ensureSubProcess(subProcessId);
        validateDateRange(request.validFrom(), request.validTo());
        ensureUniqueControlCode(request.code(), null);

        ControlEntity control = mapper.toControlEntity(request);
        control.setCode(normalizeRequired(control.getCode()));
        control.setName(normalizeRequired(control.getName()));
        control.setDescription(normalizeNullable(control.getDescription()));
        control.setControlClass(normalizeNullable(control.getControlClass()));
        control.setObjective(normalizeNullable(control.getObjective()));
        control.setStatus(ControlStatus.active);
        ControlEntity savedControl = controlRepository.save(control);

        ControlAssignmentEntity assignment = mapper.toAssignmentEntity(request);
        assignment.setControlId(savedControl.getId());
        assignment.setSubProcessId(subProcess.getId());
        normalizeAssignment(assignment);
        ensureNoDuplicateActiveAssignment(savedControl.getId(), subProcess.getId(), null);
        ControlAssignmentEntity savedAssignment = assignmentRepository.save(assignment);

        audit(
                "CONTROL_CREATED_AND_ASSIGNED",
                AuditTargetType.CONTROL,
                savedControl.getId(),
                httpRequest,
                Map.of("controlCode", savedControl.getCode(), "subProcessId", subProcess.getId())
        );
        return toDetails(savedAssignment, savedControl, subProcess);
    }

    @Transactional
    public ControlDetailsDto attachExisting(
            UUID subProcessId,
            AttachExistingControlRequest request,
            HttpServletRequest httpRequest
    ) {
        ProcessNodeEntity subProcess = ensureSubProcess(subProcessId);
        ControlEntity control = ensureControl(request.controlId());
        validateDateRange(request.validFrom(), request.validTo());
        ensureNoDuplicateActiveAssignment(control.getId(), subProcess.getId(), null);

        ControlAssignmentEntity assignment = mapper.toAssignmentEntity(request);
        assignment.setControlId(control.getId());
        assignment.setSubProcessId(subProcess.getId());
        normalizeAssignment(assignment);
        ControlAssignmentEntity saved = assignmentRepository.save(assignment);

        audit(
                "CONTROL_ASSIGNED",
                AuditTargetType.CONTROL_ASSIGNMENT,
                saved.getId(),
                httpRequest,
                Map.of("controlId", control.getId(), "subProcessId", subProcess.getId())
        );
        return toDetails(saved, control, subProcess);
    }

    public ControlDetailsDto getAssignment(UUID controlAssignmentId) {
        ControlAssignmentEntity assignment = ensureAssignment(controlAssignmentId);
        ControlEntity control = ensureControl(assignment.getControlId());
        ProcessNodeEntity subProcess = ensureSubProcess(assignment.getSubProcessId());
        return toDetails(assignment, control, subProcess);
    }

    @Transactional
    public ControlDetailsDto updateAssignment(
            UUID controlAssignmentId,
            UpdateControlAssignmentRequest request,
            HttpServletRequest httpRequest
    ) {
        ControlAssignmentEntity assignment = ensureAssignment(controlAssignmentId);
        ControlEntity control = ensureControl(assignment.getControlId());
        ProcessNodeEntity subProcess = ensureSubProcess(assignment.getSubProcessId());
        validateDateRange(request.validFrom(), request.validTo());

        mapper.updateAssignment(request, assignment);
        normalizeAssignment(assignment);

        if (assignment.getAssignmentStatus() == ControlAssignmentStatus.active) {
            ensureNoDuplicateActiveAssignment(control.getId(), subProcess.getId(), assignment.getId());
        }

        ControlAssignmentEntity saved = assignmentRepository.save(assignment);
        audit(
                "CONTROL_ASSIGNMENT_UPDATED",
                AuditTargetType.CONTROL_ASSIGNMENT,
                saved.getId(),
                httpRequest,
                Map.of("controlId", control.getId(), "subProcessId", subProcess.getId())
        );
        return toDetails(saved, control, subProcess);
    }

    @Transactional
    public void deleteAssignment(UUID controlAssignmentId, HttpServletRequest httpRequest) {
        ControlAssignmentEntity assignment = ensureAssignment(controlAssignmentId);
        assignmentRepository.delete(assignment);
        audit(
                "CONTROL_ASSIGNMENT_DELETED",
                AuditTargetType.CONTROL_ASSIGNMENT,
                controlAssignmentId,
                httpRequest,
                Map.of("controlId", assignment.getControlId(), "subProcessId", assignment.getSubProcessId())
        );
    }

    @Transactional
    public ControlDetailsDto moveAssignment(
            UUID controlAssignmentId,
            MoveControlAssignmentRequest request,
            HttpServletRequest httpRequest
    ) {
        ControlAssignmentEntity source = ensureAssignment(controlAssignmentId);
        ControlEntity control = ensureControl(source.getControlId());
        ProcessNodeEntity targetSubProcess = ensureSubProcess(request.targetSubProcessId());
        ensureNoDuplicateActiveAssignment(control.getId(), targetSubProcess.getId(), source.getId());

        LocalDate moveDate = request.validFrom() == null ? LocalDate.now() : request.validFrom();
        source.setAssignmentStatus(ControlAssignmentStatus.inactive);
        if (source.getValidTo() == null) {
            source.setValidTo(moveDate);
        }
        assignmentRepository.save(source);

        ControlAssignmentEntity target = ControlAssignmentEntity.builder()
                .controlId(control.getId())
                .subProcessId(targetSubProcess.getId())
                .ownerId(source.getOwnerId())
                .ownerName(source.getOwnerName())
                .validFrom(moveDate)
                .sortOrder(source.getSortOrder())
                .operationPeriod(source.getOperationPeriod())
                .testMethod(source.getTestMethod())
                .testPlan(source.getTestPlan())
                .assignmentStatus(ControlAssignmentStatus.active)
                .build();

        ControlAssignmentEntity savedTarget = assignmentRepository.save(target);
        audit(
                "CONTROL_ASSIGNMENT_MOVED",
                AuditTargetType.CONTROL_ASSIGNMENT,
                savedTarget.getId(),
                httpRequest,
                Map.of(
                        "controlId", control.getId(),
                        "sourceSubProcessId", source.getSubProcessId(),
                        "targetSubProcessId", targetSubProcess.getId()
                )
        );
        return toDetails(savedTarget, control, targetSubProcess);
    }

    private ControlStructureNodeDto toProcessStructureNode(ProcessNodeEntity node) {
        UUID processId = NODE_TYPE_PROCESS.equals(node.getNodeType()) ? node.getId() : node.getParentId();
        UUID subProcessId = NODE_TYPE_SUB_PROCESS.equals(node.getNodeType()) ? node.getId() : null;

        return ControlStructureNodeDto.builder()
                .id(node.getId())
                .nodeType(node.getNodeType())
                .code(node.getCode())
                .title(node.getTitle())
                .description(node.getDescription())
                .parentId(node.getParentId())
                .processId(processId)
                .subProcessId(subProcessId)
                .status(node.getStatus())
                .sortOrder(node.getSortOrder())
                .ownerId(node.getOwnerId())
                .ownerName(node.getOwnerName())
                .build();
    }

    private ControlStructureNodeDto toControlStructureNode(
            ControlAssignmentEntity assignment,
            ControlEntity control,
            Map<UUID, ProcessNodeEntity> processNodesById
    ) {
        ProcessNodeEntity subProcess = processNodesById.get(assignment.getSubProcessId());
        if (control == null || subProcess == null) {
            return null;
        }

        return ControlStructureNodeDto.builder()
                .id(assignment.getId())
                .nodeType(NODE_TYPE_CONTROL)
                .code(control.getCode())
                .title(control.getName())
                .description(control.getDescription())
                .parentId(subProcess.getId())
                .processId(subProcess.getParentId())
                .subProcessId(subProcess.getId())
                .controlId(control.getId())
                .controlAssignmentId(assignment.getId())
                .status(control.getStatus().name())
                .sortOrder(assignment.getSortOrder())
                .ownerId(assignment.getOwnerId())
                .ownerName(assignment.getOwnerName())
                .validFrom(assignment.getValidFrom())
                .validTo(assignment.getValidTo())
                .build();
    }

    private ControlDetailsDto toDetails(
            ControlAssignmentEntity assignment,
            ControlEntity control,
            ProcessNodeEntity subProcess
    ) {
        ProcessNodeEntity parentProcess = subProcess.getParentId() == null
                ? null
                : processNodeRepository.findById(subProcess.getParentId()).orElse(null);
        return mapper.toDetails(assignment, control, subProcess, parentProcess);
    }

    private ControlEntity ensureControl(UUID id) {
        return controlRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Control not found: " + id, id));
    }

    private ControlAssignmentEntity ensureAssignment(UUID id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Control assignment not found: " + id, id));
    }

    private ProcessNodeEntity ensureSubProcess(UUID id) {
        ProcessNodeEntity entity = processNodeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Process node not found: " + id, id));

        if (!NODE_TYPE_SUB_PROCESS.equals(entity.getNodeType())) {
            throw new ConflictException("MASTER_DATA_INVALID_PARENT", "error.masterdata.invalidParent", "Process node is not a sub process: " + id, id);
        }

        return entity;
    }

    private void ensureUniqueControlCode(String code, UUID currentId) {
        String normalized = normalizeRequired(code);
        boolean exists = currentId == null
                ? controlRepository.existsByCodeIgnoreCase(normalized)
                : controlRepository.existsByCodeIgnoreCaseAndIdNot(normalized, currentId);
        if (exists) {
            throw new ConflictException("MASTER_DATA_DUPLICATE_CODE", "error.masterdata.duplicateCode", "Duplicate control code: " + normalized, normalized);
        }
    }

    private void ensureNoDuplicateActiveAssignment(UUID controlId, UUID subProcessId, UUID currentAssignmentId) {
        boolean exists = currentAssignmentId == null
                ? assignmentRepository.existsByControlIdAndSubProcessIdAndAssignmentStatus(controlId, subProcessId, ControlAssignmentStatus.active)
                : assignmentRepository.existsByControlIdAndSubProcessIdAndAssignmentStatusAndIdNot(controlId, subProcessId, ControlAssignmentStatus.active, currentAssignmentId);
        if (exists) {
            throw new ConflictException(
                    "MASTER_DATA_DUPLICATE_ASSIGNMENT",
                    "error.masterdata.duplicateAssignment",
                    "Control is already actively assigned to sub process: " + subProcessId,
                    subProcessId
            );
        }
    }

    private void normalizeAssignment(ControlAssignmentEntity assignment) {
        validateDateRange(assignment.getValidFrom(), assignment.getValidTo());
        assignment.setOwnerName(normalizeNullable(assignment.getOwnerName()));
        assignment.setOperationPeriod(normalizeNullable(assignment.getOperationPeriod()));
        assignment.setTestMethod(normalizeNullable(assignment.getTestMethod()));
        assignment.setTestPlan(normalizeNullable(assignment.getTestPlan()));
        if (assignment.getAssignmentStatus() == null) {
            assignment.setAssignmentStatus(ControlAssignmentStatus.active);
        }
    }

    private void validateDateRange(LocalDate validFrom, LocalDate validTo) {
        try {
            requireValidRange(validFrom, validTo, "Control assignment validTo cannot be before validFrom");
        } catch (IllegalArgumentException ex) {
            throw new ConflictException(
                    "MASTER_DATA_INVALID_DATE_RANGE",
                    "error.masterdata.invalidDateRange",
                    ex.getMessage()
            );
        }
    }

    private int compareStructureNodes(ControlStructureNodeDto left, ControlStructureNodeDto right) {
        int parent = Comparator.nullsFirst(UUID::compareTo).compare(left.parentId(), right.parentId());
        if (parent != 0) {
            return parent;
        }

        int sort = Comparator.nullsLast(Integer::compareTo).compare(left.sortOrder(), right.sortOrder());
        if (sort != 0) {
            return sort;
        }

        return Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER).compare(left.title(), right.title());
    }

    private void audit(
            String eventName,
            AuditTargetType targetType,
            UUID targetId,
            HttpServletRequest request,
            Map<String, Object> details
    ) {
        Map<String, Object> safeDetails = new LinkedHashMap<>();
        safeDetails.put("event", eventName);
        safeDetails.putAll(details);
        auditService.log(
                AuditEventType.MASTER_DATA_CHANGED,
                targetType,
                targetId.toString(),
                ActionResult.SUCCESS,
                currentUserProvider.getCurrentUserIdOrNull(),
                request,
                safeDetails
        );
    }
}
