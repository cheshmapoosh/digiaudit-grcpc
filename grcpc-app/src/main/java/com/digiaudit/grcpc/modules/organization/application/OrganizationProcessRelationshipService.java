package com.digiaudit.grcpc.modules.organization.application;

import static com.digiaudit.grcpc.common.util.Dates.*;
import static com.digiaudit.grcpc.common.util.Texts.normalizeNullable;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ControlAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ControlEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessNodeEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.enums.ControlAssignmentStatus;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ControlAssignmentRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ControlRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessNodeRepository;
import com.digiaudit.grcpc.modules.masterdata.risk.domain.entity.RiskNodeEntity;
import com.digiaudit.grcpc.modules.masterdata.risk.domain.repository.RiskNodeRepository;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationControlViewResponse;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationRiskAssignmentRequest;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationRiskAssignmentResponse;
import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationProcessAssignmentEntity;
import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationProcessRiskAssignmentEntity;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationProcessAssignmentRepository;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationProcessRiskAssignmentRepository;
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
public class OrganizationProcessRelationshipService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationProcessAssignmentRepository processAssignmentRepository;
    private final OrganizationProcessRiskAssignmentRepository riskAssignmentRepository;
    private final ProcessNodeRepository processNodeRepository;
    private final ControlAssignmentRepository controlAssignmentRepository;
    private final ControlRepository controlRepository;
    private final RiskNodeRepository riskNodeRepository;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<OrganizationControlViewResponse> listControls(UUID organizationId) {
        ensureOrganization(organizationId);
        List<OrganizationProcessAssignmentEntity> processAssignments =
                processAssignmentRepository.findByOrganizationIdAndActiveTrueOrderByCreatedAtAsc(organizationId);
        List<UUID> subProcessIds = processAssignments.stream()
                .map(OrganizationProcessAssignmentEntity::getProcessNodeId)
                .distinct()
                .toList();

        if (subProcessIds.isEmpty()) {
            return List.of();
        }

        Map<UUID, ProcessNodeEntity> subProcesses = processNodeRepository.findAllById(subProcessIds)
                .stream()
                .collect(Collectors.toMap(ProcessNodeEntity::getId, Function.identity()));
        List<ControlAssignmentEntity> controlAssignments =
                controlAssignmentRepository.findBySubProcessIdInAndAssignmentStatus(subProcessIds, ControlAssignmentStatus.active);
        List<UUID> controlIds = controlAssignments.stream()
                .map(ControlAssignmentEntity::getControlId)
                .distinct()
                .toList();
        Map<UUID, ControlEntity> controls = controlRepository.findAllById(controlIds)
                .stream()
                .collect(Collectors.toMap(ControlEntity::getId, Function.identity()));

        return controlAssignments.stream()
                .map(assignment -> toControlResponse(organizationId, assignment, subProcesses, controls))
                .filter(Objects::nonNull)
                .sorted(this::compareControls)
                .toList();
    }

    public List<OrganizationRiskAssignmentResponse> listRisks(UUID organizationId) {
        ensureOrganization(organizationId);
        List<UUID> activeSubProcessIds = processAssignmentRepository
                .findByOrganizationIdAndActiveTrueOrderByCreatedAtAsc(organizationId)
                .stream()
                .map(OrganizationProcessAssignmentEntity::getProcessNodeId)
                .distinct()
                .toList();

        if (activeSubProcessIds.isEmpty()) {
            return List.of();
        }

        List<OrganizationProcessRiskAssignmentEntity> assignments =
                riskAssignmentRepository.findByOrganizationIdAndProcessNodeIdInOrderByCreatedAtAsc(
                        organizationId,
                        activeSubProcessIds
                );

        if (assignments.isEmpty()) {
            return List.of();
        }

        Map<UUID, ProcessNodeEntity> subProcesses = processNodeRepository.findAllById(
                        assignments.stream()
                                .map(OrganizationProcessRiskAssignmentEntity::getProcessNodeId)
                                .distinct()
                                .toList()
                )
                .stream()
                .collect(Collectors.toMap(ProcessNodeEntity::getId, Function.identity()));
        Map<UUID, RiskNodeEntity> risks = riskNodeRepository.findAllById(
                        assignments.stream()
                                .map(OrganizationProcessRiskAssignmentEntity::getRiskNodeId)
                                .distinct()
                                .toList()
                )
                .stream()
                .collect(Collectors.toMap(RiskNodeEntity::getId, Function.identity()));

        return assignments.stream()
                .map(assignment -> toRiskResponse(assignment, subProcesses, risks))
                .filter(Objects::nonNull)
                .sorted(this::compareRisks)
                .toList();
    }

    @Transactional
    public OrganizationRiskAssignmentResponse assignRisk(
            OrganizationRiskAssignmentRequest request,
            HttpServletRequest httpRequest
    ) {
        ensureOrganization(request.organizationId());
        ProcessNodeEntity subProcess = ensureSubProcess(request.processNodeId());
        RiskNodeEntity risk = ensureRiskTemplate(request.riskNodeId());
        ensureOrganizationOwnsSubProcess(request.organizationId(), request.processNodeId());

        LocalDate validFrom = parseNullable(request.validFrom());
        LocalDate validTo = parseNullable(request.validTo());
        requireValidRange(validFrom, validTo, "Risk assignment validTo cannot be before validFrom");

        OrganizationProcessRiskAssignmentEntity entity = riskAssignmentRepository
                .findByOrganizationIdAndProcessNodeIdAndRiskNodeId(
                        request.organizationId(),
                        request.processNodeId(),
                        request.riskNodeId()
                )
                .orElseGet(() -> OrganizationProcessRiskAssignmentEntity.builder()
                        .organizationId(request.organizationId())
                        .processNodeId(request.processNodeId())
                        .riskNodeId(request.riskNodeId())
                        .build());

        entity.setAssignmentType(defaultAssignmentType(request.assignmentType()));
        entity.setValidFrom(validFrom);
        entity.setValidTo(validTo);
        entity.setActive(request.isActive() == null || request.isActive());

        OrganizationProcessRiskAssignmentEntity saved = riskAssignmentRepository.save(entity);
        audit(
                "ORG_PROCESS_RISK_ASSIGNED",
                saved.getId(),
                httpRequest,
                Map.of(
                        "organizationId", saved.getOrganizationId(),
                        "processNodeId", saved.getProcessNodeId(),
                        "riskNodeId", saved.getRiskNodeId()
                )
        );

        return toRiskResponse(saved, Map.of(subProcess.getId(), subProcess), Map.of(risk.getId(), risk));
    }

    @Transactional
    public void removeRiskAssignment(UUID id, HttpServletRequest httpRequest) {
        OrganizationProcessRiskAssignmentEntity entity = riskAssignmentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(
                        "MASTER_DATA_NOT_FOUND",
                        "error.masterdata.notFound",
                        "Organization risk assignment not found: " + id,
                        id
                ));
        riskAssignmentRepository.delete(entity);
        audit(
                "ORG_PROCESS_RISK_ASSIGNMENT_DELETED",
                id,
                httpRequest,
                Map.of(
                        "organizationId", entity.getOrganizationId(),
                        "processNodeId", entity.getProcessNodeId(),
                        "riskNodeId", entity.getRiskNodeId()
                )
        );
    }

    private OrganizationControlViewResponse toControlResponse(
            UUID organizationId,
            ControlAssignmentEntity assignment,
            Map<UUID, ProcessNodeEntity> subProcesses,
            Map<UUID, ControlEntity> controls
    ) {
        ProcessNodeEntity subProcess = subProcesses.get(assignment.getSubProcessId());
        ControlEntity control = controls.get(assignment.getControlId());

        if (subProcess == null || control == null) {
            return null;
        }

        return OrganizationControlViewResponse.builder()
                .organizationId(organizationId)
                .processNodeId(subProcess.getId())
                .subProcessCode(subProcess.getCode())
                .subProcessTitle(subProcess.getTitle())
                .controlId(control.getId())
                .controlCode(control.getCode())
                .controlTitle(control.getName())
                .controlDescription(control.getDescription())
                .controlAutomation(control.getAutomationType() == null ? null : control.getAutomationType().name())
                .controlFrequency(null)
                .controlClassification(control.getControlClass())
                .controlOwner(assignment.getOwnerName())
                .importance(control.getImportance() == null ? null : control.getImportance().name())
                .status(control.getStatus() == null ? null : control.getStatus().name())
                .processControlAssignmentId(assignment.getId())
                .assignmentType(assignment.getAssignmentStatus() == null ? null : assignment.getAssignmentStatus().name())
                .validFrom(assignment.getValidFrom())
                .validTo(assignment.getValidTo())
                .isActive(assignment.getAssignmentStatus() == ControlAssignmentStatus.active)
                .build();
    }

    private OrganizationRiskAssignmentResponse toRiskResponse(
            OrganizationProcessRiskAssignmentEntity assignment,
            Map<UUID, ProcessNodeEntity> subProcesses,
            Map<UUID, RiskNodeEntity> risks
    ) {
        ProcessNodeEntity subProcess = subProcesses.get(assignment.getProcessNodeId());
        RiskNodeEntity risk = risks.get(assignment.getRiskNodeId());

        if (subProcess == null || risk == null) {
            return null;
        }

        return OrganizationRiskAssignmentResponse.builder()
                .id(assignment.getId())
                .organizationId(assignment.getOrganizationId())
                .processNodeId(subProcess.getId())
                .subProcessCode(subProcess.getCode())
                .subProcessTitle(subProcess.getTitle())
                .riskNodeId(risk.getId())
                .riskCode(risk.getCode())
                .riskTitle(risk.getTitle())
                .riskDescription(risk.getDescription())
                .riskType(risk.getRiskType())
                .status(risk.getStatus())
                .assignmentType(assignment.getAssignmentType())
                .validFrom(assignment.getValidFrom())
                .validTo(assignment.getValidTo())
                .isActive(assignment.isActive())
                .createdAt(assignment.getCreatedAt())
                .updatedAt(assignment.getUpdatedAt())
                .createdBy(assignment.getCreatedBy())
                .updatedBy(assignment.getUpdatedBy())
                .build();
    }

    private void ensureOrganization(UUID id) {
        if (!organizationRepository.existsById(id)) {
            throw new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Organization not found: " + id, id);
        }
    }

    private ProcessNodeEntity ensureSubProcess(UUID id) {
        ProcessNodeEntity entity = processNodeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Process node not found: " + id, id));

        if (!"subProcess".equals(entity.getNodeType())) {
            throw new ConflictException("MASTER_DATA_INVALID_PARENT", "error.masterdata.invalidParent", "Process node is not a sub process: " + id, id);
        }

        return entity;
    }

    private RiskNodeEntity ensureRiskTemplate(UUID id) {
        RiskNodeEntity entity = riskNodeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Risk node not found: " + id, id));

        if (!"riskTemplate".equals(entity.getNodeType())) {
            throw new ConflictException("MASTER_DATA_INVALID_PARENT", "error.masterdata.invalidParent", "Risk node is not a risk template: " + id, id);
        }

        return entity;
    }

    private void ensureOrganizationOwnsSubProcess(UUID organizationId, UUID processNodeId) {
        OrganizationProcessAssignmentEntity assignment = processAssignmentRepository
                .findByOrganizationIdAndProcessNodeId(organizationId, processNodeId)
                .orElseThrow(() -> new ConflictException(
                        "MASTER_DATA_INVALID_PARENT",
                        "error.masterdata.invalidParent",
                        "Sub process is not assigned to organization: " + processNodeId,
                        processNodeId
                ));

        if (!assignment.isActive()) {
            throw new ConflictException(
                    "MASTER_DATA_INVALID_PARENT",
                    "error.masterdata.invalidParent",
                    "Sub process assignment is inactive: " + processNodeId,
                    processNodeId
            );
        }
    }

    private String defaultAssignmentType(String assignmentType) {
        String normalized = normalizeNullable(assignmentType);
        return normalized == null ? "scope" : normalized;
    }

    private int compareControls(OrganizationControlViewResponse left, OrganizationControlViewResponse right) {
        int process = compareStrings(left.subProcessCode(), right.subProcessCode());
        if (process != 0) {
            return process;
        }
        int code = compareStrings(left.controlCode(), right.controlCode());
        return code != 0 ? code : compareStrings(left.controlTitle(), right.controlTitle());
    }

    private int compareRisks(OrganizationRiskAssignmentResponse left, OrganizationRiskAssignmentResponse right) {
        int process = compareStrings(left.subProcessCode(), right.subProcessCode());
        if (process != 0) {
            return process;
        }
        int code = compareStrings(left.riskCode(), right.riskCode());
        return code != 0 ? code : compareStrings(left.riskTitle(), right.riskTitle());
    }

    private int compareStrings(String left, String right) {
        return Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER).compare(left, right);
    }

    private void audit(String eventName, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        Map<String, Object> safeDetails = new LinkedHashMap<>();
        safeDetails.put("event", eventName);
        safeDetails.putAll(details);
        auditService.log(
                AuditEventType.MASTER_DATA_CHANGED,
                AuditTargetType.ORGANIZATION_RISK_ASSIGNMENT,
                targetId.toString(),
                ActionResult.SUCCESS,
                currentUserProvider.getCurrentUserIdOrNull(),
                request,
                safeDetails
        );
    }
}
