package com.digiaudit.grcpc.modules.masterdata.process.application;

import static com.digiaudit.grcpc.common.util.Dates.*;
import static com.digiaudit.grcpc.common.util.Texts.normalizeNullable;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.entity.ObjectiveNodeEntity;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.repository.ObjectiveNodeRepository;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessObjectiveAssignmentRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessObjectiveAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.process.api.mapper.ProcessObjectiveAssignmentMapper;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessObjectiveAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessNodeRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessObjectiveAssignmentRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
public class ProcessObjectiveAssignmentService {

    private static final Set<String> SUPPORTED_ASSIGNMENT_TYPES = Set.of("scope", "owner", "participant");

    private final ProcessObjectiveAssignmentRepository repository;
    private final ProcessNodeRepository processNodeRepository;
    private final ObjectiveNodeRepository objectiveNodeRepository;
    private final ProcessObjectiveAssignmentMapper mapper;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<ProcessObjectiveAssignmentResponse> listByProcess(UUID processNodeId) {
        ensureProcessNode(processNodeId);
        List<ProcessObjectiveAssignmentEntity> assignments = repository.findByProcessNodeIdOrderByCreatedAtAsc(processNodeId);
        Map<UUID, ObjectiveNodeEntity> objectivesById = objectiveNodeRepository.findAllById(
                        assignments.stream().map(ProcessObjectiveAssignmentEntity::getObjectiveNodeId).toList()
                )
                .stream()
                .collect(Collectors.toMap(ObjectiveNodeEntity::getId, Function.identity()));

        return assignments.stream()
                .map(assignment -> mapper.toResponse(assignment, requireObjective(objectivesById, assignment.getObjectiveNodeId())))
                .toList();
    }

    @Transactional
    public ProcessObjectiveAssignmentResponse assign(ProcessObjectiveAssignmentRequest request, HttpServletRequest httpRequest) {
        ensureProcessNode(request.processNodeId());
        ObjectiveNodeEntity objective = ensureObjective(request.objectiveNodeId());
        LocalDate validFrom = parseNullable(request.validFrom());
        LocalDate validTo = parseNullable(request.validTo());
        requireValidRange(validFrom, validTo, "Assignment validTo cannot be before validFrom");

        ProcessObjectiveAssignmentEntity entity = repository.findByProcessNodeIdAndObjectiveNodeId(request.processNodeId(), request.objectiveNodeId())
                .orElseGet(() -> ProcessObjectiveAssignmentEntity.builder()
                        .processNodeId(request.processNodeId())
                        .objectiveNodeId(request.objectiveNodeId())
                        .build());
        entity.setAssignmentType(normalizeAssignmentType(request.assignmentType()));
        entity.setValidFrom(validFrom);
        entity.setValidTo(validTo);
        entity.setActive(request.isActive() == null || request.isActive());

        ProcessObjectiveAssignmentEntity saved = repository.save(entity);
        log.debug(
                "Saved process objective assignment. assignmentId={}, processNodeId={}, objectiveNodeId={}",
                saved.getId(),
                saved.getProcessNodeId(),
                saved.getObjectiveNodeId()
        );
        audit("PROCESS_OBJECTIVE_ASSIGNED", saved.getId(), httpRequest, Map.of(
                "processNodeId", saved.getProcessNodeId(),
                "objectiveNodeId", saved.getObjectiveNodeId()
        ));
        return mapper.toResponse(saved, objective);
    }

    @Transactional
    public void remove(UUID id, HttpServletRequest httpRequest) {
        ProcessObjectiveAssignmentEntity entity = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Process objective assignment not found: " + id, id));
        log.debug(
                "Deleting process objective assignment. assignmentId={}, processNodeId={}, objectiveNodeId={}",
                entity.getId(),
                entity.getProcessNodeId(),
                entity.getObjectiveNodeId()
        );
        repository.delete(entity);
        audit("PROCESS_OBJECTIVE_ASSIGNMENT_DELETED", id, httpRequest, Map.of(
                "processNodeId", entity.getProcessNodeId(),
                "objectiveNodeId", entity.getObjectiveNodeId()
        ));
    }

    private void ensureProcessNode(UUID id) {
        if (!processNodeRepository.existsById(id)) {
            throw new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Process node not found: " + id, id);
        }
    }

    private ObjectiveNodeEntity ensureObjective(UUID id) {
        return objectiveNodeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Objective not found: " + id, id));
    }

    private ObjectiveNodeEntity requireObjective(Map<UUID, ObjectiveNodeEntity> objectivesById, UUID objectiveNodeId) {
        ObjectiveNodeEntity objective = objectivesById.get(objectiveNodeId);
        if (objective == null) {
            throw new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Objective not found: " + objectiveNodeId, objectiveNodeId);
        }

        return objective;
    }

    private String normalizeAssignmentType(String assignmentType) {
        String normalized = normalizeNullable(assignmentType);
        if (normalized == null) {
            return "scope";
        }

        if (!SUPPORTED_ASSIGNMENT_TYPES.contains(normalized)) {
            throw new ConflictException(
                    "MASTER_DATA_INVALID_ASSIGNMENT_TYPE",
                    "error.masterdata.invalidAssignmentType",
                    "Invalid process objective assignment type: " + assignmentType,
                    assignmentType
            );
        }

        return normalized;
    }

    private void audit(String eventName, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        Map<String, Object> safeDetails = new LinkedHashMap<>();
        safeDetails.put("event", eventName);
        safeDetails.putAll(details);
        auditService.log(AuditEventType.MASTER_DATA_CHANGED, AuditTargetType.PROCESS_OBJECTIVE_ASSIGNMENT, targetId.toString(), ActionResult.SUCCESS, currentUserProvider.getCurrentUserIdOrNull(), request, safeDetails);
    }
}
