package com.digiaudit.grcpc.modules.organization.application;

import static com.digiaudit.grcpc.common.util.Dates.*;
import static com.digiaudit.grcpc.common.util.Texts.normalizeNullable;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessNodeRepository;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationProcessAssignmentRequest;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationProcessAssignmentResponse;
import com.digiaudit.grcpc.modules.organization.api.mapper.OrganizationProcessAssignmentMapper;
import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationProcessAssignmentEntity;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationProcessAssignmentRepository;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationProcessRiskAssignmentRepository;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrganizationProcessAssignmentService {

    private final OrganizationProcessAssignmentRepository repository;
    private final OrganizationProcessRiskAssignmentRepository riskAssignmentRepository;
    private final OrganizationRepository organizationRepository;
    private final ProcessNodeRepository processNodeRepository;
    private final OrganizationProcessAssignmentMapper mapper;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<OrganizationProcessAssignmentResponse> listByOrganization(UUID organizationId) {
        ensureOrganization(organizationId);
        return repository.findByOrganizationIdOrderByCreatedAtAsc(organizationId).stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public OrganizationProcessAssignmentResponse assign(OrganizationProcessAssignmentRequest request, HttpServletRequest httpRequest) {
        ensureOrganization(request.organizationId());
        ensureProcessNode(request.processNodeId());
        LocalDate validFrom = parseNullable(request.validFrom());
        LocalDate validTo = parseNullable(request.validTo());
        requireValidRange(validFrom, validTo, "Assignment validTo cannot be before validFrom");
        OrganizationProcessAssignmentEntity entity = repository.findByOrganizationIdAndProcessNodeId(request.organizationId(), request.processNodeId())
                .orElseGet(() -> OrganizationProcessAssignmentEntity.builder()
                        .organizationId(request.organizationId())
                        .processNodeId(request.processNodeId())
                        .build());
        entity.setAssignmentType(normalizeNullable(request.assignmentType()) == null ? "scope" : normalizeNullable(request.assignmentType()));
        entity.setValidFrom(validFrom);
        entity.setValidTo(validTo);
        entity.setActive(request.isActive() == null || request.isActive());
        OrganizationProcessAssignmentEntity saved = repository.save(entity);
        audit("ORG_PROCESS_ASSIGNED", saved.getId(), httpRequest, Map.of("organizationId", saved.getOrganizationId(), "processNodeId", saved.getProcessNodeId()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public void remove(UUID id, HttpServletRequest httpRequest) {
        OrganizationProcessAssignmentEntity entity = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Organization process assignment not found: " + id, id));
        long removedRiskAssignments =
                riskAssignmentRepository.deleteByOrganizationIdAndProcessNodeId(entity.getOrganizationId(), entity.getProcessNodeId());
        repository.delete(entity);
        audit("ORG_PROCESS_ASSIGNMENT_DELETED", id, httpRequest, Map.of(
                "organizationId", entity.getOrganizationId(),
                "processNodeId", entity.getProcessNodeId(),
                "removedRiskAssignments", removedRiskAssignments
        ));
    }

    private void ensureOrganization(UUID id) {
        if (!organizationRepository.existsById(id)) {
            throw new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Organization not found: " + id, id);
        }
    }

    private void ensureProcessNode(UUID id) {
        if (!processNodeRepository.existsById(id)) {
            throw new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Process node not found: " + id, id);
        }
    }

    private void audit(String eventName, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        Map<String, Object> safeDetails = new LinkedHashMap<>();
        safeDetails.put("event", eventName);
        safeDetails.putAll(details);
        auditService.log(AuditEventType.MASTER_DATA_CHANGED, AuditTargetType.ORGANIZATION_PROCESS_ASSIGNMENT, targetId.toString(), ActionResult.SUCCESS, currentUserProvider.getCurrentUserIdOrNull(), request, safeDetails);
    }
}
