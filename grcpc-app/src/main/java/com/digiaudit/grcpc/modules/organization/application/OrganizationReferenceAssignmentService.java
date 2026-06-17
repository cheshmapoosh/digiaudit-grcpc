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
import com.digiaudit.grcpc.modules.masterdata.policy.domain.entity.PolicyNodeEntity;
import com.digiaudit.grcpc.modules.masterdata.policy.domain.repository.PolicyNodeRepository;
import com.digiaudit.grcpc.modules.masterdata.control.domain.repository.ControlRepository;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationReferenceAssignmentRequest;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationReferenceAssignmentResponse;
import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationReferenceAssignmentEntity;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationReferenceAssignmentRepository;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationRepository;
import com.digiaudit.grcpc.modules.regulation.domain.entity.RegulationEntity;
import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationNodeType;
import com.digiaudit.grcpc.modules.regulation.domain.repository.RegulationRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrganizationReferenceAssignmentService {

    private static final String TYPE_CONTROL = "CONTROL";
    private static final String TYPE_REGULATION = "REGULATION";
    private static final String TYPE_POLICY = "POLICY";
    private static final Set<String> SUPPORTED_REFERENCE_TYPES = Set.of(
            TYPE_CONTROL,
            TYPE_REGULATION,
            TYPE_POLICY
    );

    private final OrganizationRepository organizationRepository;
    private final OrganizationReferenceAssignmentRepository repository;
    private final ControlRepository controlRepository;
    private final RegulationRepository regulationRepository;
    private final PolicyNodeRepository policyNodeRepository;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<OrganizationReferenceAssignmentResponse> listByOrganization(
            UUID organizationId,
            String referenceType
    ) {
        ensureOrganization(organizationId);
        String normalizedType = normalizeReferenceType(referenceType);

        return repository
                .findByOrganizationIdAndReferenceTypeOrderByCreatedAtAsc(organizationId, normalizedType)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public OrganizationReferenceAssignmentResponse assign(
            OrganizationReferenceAssignmentRequest request,
            HttpServletRequest httpRequest
    ) {
        ensureOrganization(request.organizationId());
        String referenceType = normalizeReferenceType(request.referenceType());
        ensureReference(referenceType, request.referenceId());

        LocalDate validFrom = parseNullable(request.validFrom());
        LocalDate validTo = parseNullable(request.validTo());
        requireValidRange(validFrom, validTo, "Reference assignment validTo cannot be before validFrom");

        OrganizationReferenceAssignmentEntity entity = repository
                .findByOrganizationIdAndReferenceTypeAndReferenceId(
                        request.organizationId(),
                        referenceType,
                        request.referenceId()
                )
                .orElseGet(() -> OrganizationReferenceAssignmentEntity.builder()
                        .organizationId(request.organizationId())
                        .referenceType(referenceType)
                        .referenceId(request.referenceId())
                        .build());

        entity.setAssignmentType(defaultAssignmentType(request.assignmentType()));
        entity.setValidFrom(validFrom);
        entity.setValidTo(validTo);
        entity.setActive(request.isActive() == null || request.isActive());

        OrganizationReferenceAssignmentEntity saved = repository.save(entity);
        audit("ORG_REFERENCE_ASSIGNED", saved.getId(), httpRequest, Map.of(
                "organizationId", saved.getOrganizationId(),
                "referenceType", saved.getReferenceType(),
                "referenceId", saved.getReferenceId()
        ));

        return toResponse(saved);
    }

    @Transactional
    public void remove(UUID id, HttpServletRequest httpRequest) {
        OrganizationReferenceAssignmentEntity entity = repository.findById(id)
                .orElseThrow(() -> new NotFoundException(
                        "MASTER_DATA_NOT_FOUND",
                        "error.masterdata.notFound",
                        "Organization reference assignment not found: " + id,
                        id
                ));

        repository.delete(entity);
        audit("ORG_REFERENCE_ASSIGNMENT_DELETED", id, httpRequest, Map.of(
                "organizationId", entity.getOrganizationId(),
                "referenceType", entity.getReferenceType(),
                "referenceId", entity.getReferenceId()
        ));
    }

    private void ensureOrganization(UUID id) {
        if (!organizationRepository.existsById(id)) {
            throw new NotFoundException(
                    "MASTER_DATA_NOT_FOUND",
                    "error.masterdata.notFound",
                    "Organization not found: " + id,
                    id
            );
        }
    }

    private void ensureReference(String referenceType, UUID referenceId) {
        switch (referenceType) {
            case TYPE_CONTROL -> {
                if (!controlRepository.existsById(referenceId)) {
                    throw notFound(referenceType, referenceId);
                }
            }
            case TYPE_REGULATION -> {
                RegulationEntity regulation = regulationRepository.findById(referenceId)
                        .orElseThrow(() -> notFound(referenceType, referenceId));
                if (regulation.getNodeType() != RegulationNodeType.LAW) {
                    throw invalidReference(referenceType, referenceId);
                }
            }
            case TYPE_POLICY -> {
                PolicyNodeEntity policy = policyNodeRepository.findById(referenceId)
                        .orElseThrow(() -> notFound(referenceType, referenceId));
                if (!"policy".equals(policy.getNodeType())) {
                    throw invalidReference(referenceType, referenceId);
                }
            }
            default -> throw invalidReference(referenceType, referenceId);
        }
    }

    private String normalizeReferenceType(String referenceType) {
        String normalized = normalizeNullable(referenceType);
        String upper = normalized == null ? "" : normalized.toUpperCase();

        if (!SUPPORTED_REFERENCE_TYPES.contains(upper)) {
            throw new ConflictException(
                    "MASTER_DATA_INVALID_REFERENCE",
                    "error.masterdata.invalidParent",
                    "Unsupported organization reference type: " + referenceType,
                    referenceType
            );
        }

        return upper;
    }

    private OrganizationReferenceAssignmentResponse toResponse(
            OrganizationReferenceAssignmentEntity entity
    ) {
        return OrganizationReferenceAssignmentResponse.builder()
                .id(entity.getId())
                .organizationId(entity.getOrganizationId())
                .referenceType(entity.getReferenceType())
                .referenceId(entity.getReferenceId())
                .assignmentType(entity.getAssignmentType())
                .validFrom(entity.getValidFrom())
                .validTo(entity.getValidTo())
                .isActive(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }

    private String defaultAssignmentType(String assignmentType) {
        String normalized = normalizeNullable(assignmentType);
        return normalized == null ? "scope" : normalized;
    }

    private NotFoundException notFound(String referenceType, UUID referenceId) {
        return new NotFoundException(
                "MASTER_DATA_NOT_FOUND",
                "error.masterdata.notFound",
                "Organization reference not found. type=" + referenceType + ", id=" + referenceId,
                referenceId
        );
    }

    private ConflictException invalidReference(String referenceType, UUID referenceId) {
        return new ConflictException(
                "MASTER_DATA_INVALID_REFERENCE",
                "error.masterdata.invalidParent",
                "Invalid organization reference. type=" + referenceType + ", id=" + referenceId,
                referenceId
        );
    }

    private void audit(String eventName, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        Map<String, Object> safeDetails = new LinkedHashMap<>();
        safeDetails.put("event", eventName);
        safeDetails.putAll(details);
        auditService.log(
                AuditEventType.MASTER_DATA_CHANGED,
                AuditTargetType.ORGANIZATION_REFERENCE_ASSIGNMENT,
                targetId.toString(),
                ActionResult.SUCCESS,
                currentUserProvider.getCurrentUserIdOrNull(),
                request,
                safeDetails
        );
    }
}
