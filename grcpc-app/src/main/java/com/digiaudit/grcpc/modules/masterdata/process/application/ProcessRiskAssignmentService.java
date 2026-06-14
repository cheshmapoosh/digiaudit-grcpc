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
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessRiskAssignmentRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessRiskAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.process.api.mapper.ProcessRiskAssignmentMapper;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessRiskAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessNodeRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessRiskAssignmentRepository;
import com.digiaudit.grcpc.modules.masterdata.risk.domain.entity.RiskNodeEntity;
import com.digiaudit.grcpc.modules.masterdata.risk.domain.repository.RiskNodeRepository;
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
public class ProcessRiskAssignmentService {

    private static final Set<String> SUPPORTED_ASSIGNMENT_TYPES = Set.of("scope", "owner", "participant");

    private final ProcessRiskAssignmentRepository repository;
    private final ProcessNodeRepository processNodeRepository;
    private final RiskNodeRepository riskNodeRepository;
    private final ProcessRiskAssignmentMapper mapper;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<ProcessRiskAssignmentResponse> listByProcess(UUID processNodeId) {
        ensureProcessNode(processNodeId);
        List<ProcessRiskAssignmentEntity> assignments = repository.findByProcessNodeIdOrderByCreatedAtAsc(processNodeId);
        Map<UUID, RiskNodeEntity> risksById = riskNodeRepository.findAllById(
                        assignments.stream().map(ProcessRiskAssignmentEntity::getRiskNodeId).toList()
                )
                .stream()
                .collect(Collectors.toMap(RiskNodeEntity::getId, Function.identity()));

        List<ProcessRiskAssignmentResponse> result = assignments.stream()
                .map(assignment -> mapper.toResponse(assignment, requireRisk(risksById, assignment.getRiskNodeId())))
                .toList();
        log.debug(
                "Listed process risk assignments. processNodeId={}, count={}",
                processNodeId,
                result.size()
        );
        return result;
    }

    @Transactional
    public ProcessRiskAssignmentResponse assign(ProcessRiskAssignmentRequest request, HttpServletRequest httpRequest) {
        ensureProcessNode(request.processNodeId());
        RiskNodeEntity risk = ensureRiskTemplate(request.riskNodeId());
        LocalDate validFrom = parseNullable(request.validFrom());
        LocalDate validTo = parseNullable(request.validTo());
        requireValidRange(validFrom, validTo, "Assignment validTo cannot be before validFrom");

        ProcessRiskAssignmentEntity entity = repository.findByProcessNodeIdAndRiskNodeId(request.processNodeId(), request.riskNodeId())
                .orElseGet(() -> ProcessRiskAssignmentEntity.builder()
                        .processNodeId(request.processNodeId())
                        .riskNodeId(request.riskNodeId())
                        .build());
        entity.setAssignmentType(normalizeAssignmentType(request.assignmentType()));
        entity.setValidFrom(validFrom);
        entity.setValidTo(validTo);
        entity.setActive(request.isActive() == null || request.isActive());

        ProcessRiskAssignmentEntity saved = repository.save(entity);
        log.debug(
                "Saved process risk assignment. assignmentId={}, processNodeId={}, riskNodeId={}",
                saved.getId(),
                saved.getProcessNodeId(),
                saved.getRiskNodeId()
        );
        audit("PROCESS_RISK_ADDED", saved.getId(), httpRequest, Map.of(
                "processNodeId", saved.getProcessNodeId(),
                "riskNodeId", saved.getRiskNodeId(),
                "assignmentType", saved.getAssignmentType(),
                "isActive", saved.isActive()
        ));
        return mapper.toResponse(saved, risk);
    }

    @Transactional
    public void remove(UUID id, HttpServletRequest httpRequest) {
        ProcessRiskAssignmentEntity entity = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Process risk assignment not found: " + id, id));
        log.debug(
                "Deleting process risk assignment. assignmentId={}, processNodeId={}, riskNodeId={}",
                entity.getId(),
                entity.getProcessNodeId(),
                entity.getRiskNodeId()
        );
        repository.delete(entity);
        audit("PROCESS_RISK_ASSIGNMENT_DELETED", id, httpRequest, Map.of(
                "processNodeId", entity.getProcessNodeId(),
                "riskNodeId", entity.getRiskNodeId(),
                "assignmentType", entity.getAssignmentType(),
                "isActive", entity.isActive()
        ));
    }

    private void ensureProcessNode(UUID id) {
        if (!processNodeRepository.existsById(id)) {
            throw new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Process node not found: " + id, id);
        }
    }

    private RiskNodeEntity ensureRiskTemplate(UUID id) {
        RiskNodeEntity risk = riskNodeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Risk not found: " + id, id));

        if (!"riskTemplate".equals(risk.getNodeType())) {
            throw new ConflictException(
                    "MASTER_DATA_INVALID_RISK_TYPE",
                    "error.masterdata.invalidRiskType",
                    "Process risks must reference risk templates: " + id,
                    id
            );
        }

        return risk;
    }

    private RiskNodeEntity requireRisk(Map<UUID, RiskNodeEntity> risksById, UUID riskNodeId) {
        RiskNodeEntity risk = risksById.get(riskNodeId);
        if (risk == null) {
            throw new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Risk not found: " + riskNodeId, riskNodeId);
        }

        return risk;
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
                    "Invalid process risk assignment type: " + assignmentType,
                    assignmentType
            );
        }

        return normalized;
    }

    private void audit(String eventName, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        Map<String, Object> safeDetails = new LinkedHashMap<>();
        safeDetails.put("event", eventName);
        safeDetails.putAll(details);
        auditService.log(AuditEventType.MASTER_DATA_CHANGED, AuditTargetType.PROCESS_RISK_ASSIGNMENT, targetId.toString(), ActionResult.SUCCESS, currentUserProvider.getCurrentUserIdOrNull(), request, safeDetails);
    }
}
