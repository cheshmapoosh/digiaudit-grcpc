package com.digiaudit.grcpc.modules.masterdata.control.application;

import static com.digiaudit.grcpc.common.util.Texts.normalizeNullable;
import static com.digiaudit.grcpc.common.util.Texts.normalizeRequired;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.entity.AccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.repository.AccountGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlAccountGroupLinkDto;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlDocumentDto;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlPerformancePlanDto;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlRegulationLinkDto;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlRequirementLinkDto;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlRiskLinkDto;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlStepDto;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.CreateControlDocumentRequest;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.CreateControlPerformancePlanRequest;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.CreateControlStepRequest;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.UpdateControlDocumentRequest;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.UpdateControlPerformancePlanRequest;
import com.digiaudit.grcpc.modules.masterdata.control.api.dto.UpdateControlStepRequest;
import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlAccountGroupLinkEntity;
import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlDocumentEntity;
import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlPerformancePlanEntity;
import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlRegulationLinkEntity;
import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlRequirementLinkEntity;
import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlRiskLinkEntity;
import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlStepEntity;
import com.digiaudit.grcpc.modules.masterdata.control.domain.repository.ControlAccountGroupLinkRepository;
import com.digiaudit.grcpc.modules.masterdata.control.domain.repository.ControlAssignmentRepository;
import com.digiaudit.grcpc.modules.masterdata.control.domain.repository.ControlDocumentRepository;
import com.digiaudit.grcpc.modules.masterdata.control.domain.repository.ControlPerformancePlanRepository;
import com.digiaudit.grcpc.modules.masterdata.control.domain.repository.ControlRegulationLinkRepository;
import com.digiaudit.grcpc.modules.masterdata.control.domain.repository.ControlRequirementLinkRepository;
import com.digiaudit.grcpc.modules.masterdata.control.domain.repository.ControlRiskLinkRepository;
import com.digiaudit.grcpc.modules.masterdata.control.domain.repository.ControlStepRepository;
import com.digiaudit.grcpc.modules.masterdata.risk.domain.entity.RiskNodeEntity;
import com.digiaudit.grcpc.modules.masterdata.risk.domain.repository.RiskNodeRepository;
import com.digiaudit.grcpc.modules.regulation.domain.entity.RegulationEntity;
import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationNodeType;
import com.digiaudit.grcpc.modules.regulation.domain.repository.RegulationRepository;
import jakarta.servlet.http.HttpServletRequest;
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
public class ControlAssignmentTabService {

    private final ControlAssignmentRepository assignmentRepository;
    private final ControlStepRepository stepRepository;
    private final ControlRegulationLinkRepository regulationLinkRepository;
    private final ControlRequirementLinkRepository requirementLinkRepository;
    private final ControlRiskLinkRepository riskLinkRepository;
    private final ControlAccountGroupLinkRepository accountGroupLinkRepository;
    private final ControlDocumentRepository documentRepository;
    private final ControlPerformancePlanRepository performancePlanRepository;
    private final RegulationRepository regulationRepository;
    private final RiskNodeRepository riskNodeRepository;
    private final AccountGroupRepository accountGroupRepository;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<ControlStepDto> listSteps(UUID controlAssignmentId) {
        ensureAssignment(controlAssignmentId);
        return stepRepository.findByControlAssignmentIdOrderBySortOrderAscCreatedAtAsc(controlAssignmentId)
                .stream()
                .map(this::toStepDto)
                .toList();
    }

    @Transactional
    public ControlStepDto createStep(
            UUID controlAssignmentId,
            CreateControlStepRequest request,
            HttpServletRequest httpRequest
    ) {
        ensureAssignment(controlAssignmentId);
        ControlStepEntity entity = ControlStepEntity.builder()
                .controlAssignmentId(controlAssignmentId)
                .build();
        applyStep(request.title(), request.description(), request.requiredDocument(), request.requiredNote(),
                request.sensitivity(), request.sortOrder(), entity);
        ControlStepEntity saved = stepRepository.save(entity);
        audit("CONTROL_STEP_CREATED", saved.getId(), httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
        return toStepDto(saved);
    }

    @Transactional
    public ControlStepDto updateStep(
            UUID controlAssignmentId,
            UUID stepId,
            UpdateControlStepRequest request,
            HttpServletRequest httpRequest
    ) {
        ensureAssignment(controlAssignmentId);
        ControlStepEntity entity = stepRepository.findByIdAndControlAssignmentId(stepId, controlAssignmentId)
                .orElseThrow(() -> notFound("Control step not found: " + stepId, stepId));
        applyStep(request.title(), request.description(), request.requiredDocument(), request.requiredNote(),
                request.sensitivity(), request.sortOrder(), entity);
        ControlStepEntity saved = stepRepository.save(entity);
        audit("CONTROL_STEP_UPDATED", saved.getId(), httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
        return toStepDto(saved);
    }

    @Transactional
    public void deleteStep(UUID controlAssignmentId, UUID stepId, HttpServletRequest httpRequest) {
        ensureAssignment(controlAssignmentId);
        ControlStepEntity entity = stepRepository.findByIdAndControlAssignmentId(stepId, controlAssignmentId)
                .orElseThrow(() -> notFound("Control step not found: " + stepId, stepId));
        stepRepository.delete(entity);
        audit("CONTROL_STEP_DELETED", stepId, httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
    }

    public List<ControlRegulationLinkDto> listRegulations(UUID controlAssignmentId) {
        ensureAssignment(controlAssignmentId);
        return regulationLinkRepository.findByControlAssignmentIdOrderByCreatedAtAsc(controlAssignmentId)
                .stream()
                .map(this::toRegulationLinkDto)
                .toList();
    }

    @Transactional
    public ControlRegulationLinkDto linkRegulation(
            UUID controlAssignmentId,
            UUID regulationId,
            HttpServletRequest httpRequest
    ) {
        ensureAssignment(controlAssignmentId);
        ensureNoRegulationDuplicate(controlAssignmentId, regulationId);
        RegulationEntity regulation = ensureRegulationNode(regulationId, RegulationNodeType.LAW);

        ControlRegulationLinkEntity entity = ControlRegulationLinkEntity.builder()
                .controlAssignmentId(controlAssignmentId)
                .regulationId(regulationId)
                .code(regulation.getCode())
                .title(regulation.getTitle())
                .description(regulation.getDescription())
                .validFrom(regulation.getEffectiveDate())
                .validTo(regulation.getValidTo())
                .build();
        ControlRegulationLinkEntity saved = regulationLinkRepository.save(entity);
        audit("CONTROL_REGULATION_LINKED", saved.getId(), httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
        return toRegulationLinkDto(saved);
    }

    @Transactional
    public void deleteRegulationLink(UUID controlAssignmentId, UUID linkId, HttpServletRequest httpRequest) {
        ensureAssignment(controlAssignmentId);
        ControlRegulationLinkEntity entity = regulationLinkRepository.findByIdAndControlAssignmentId(linkId, controlAssignmentId)
                .orElseThrow(() -> notFound("Control regulation link not found: " + linkId, linkId));
        regulationLinkRepository.delete(entity);
        audit("CONTROL_REGULATION_UNLINKED", linkId, httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
    }

    public List<ControlRequirementLinkDto> listRequirements(UUID controlAssignmentId) {
        ensureAssignment(controlAssignmentId);
        return requirementLinkRepository.findByControlAssignmentIdOrderByCreatedAtAsc(controlAssignmentId)
                .stream()
                .map(this::toRequirementLinkDto)
                .toList();
    }

    @Transactional
    public ControlRequirementLinkDto linkRequirement(
            UUID controlAssignmentId,
            UUID requirementId,
            HttpServletRequest httpRequest
    ) {
        ensureAssignment(controlAssignmentId);
        ensureNoRequirementDuplicate(controlAssignmentId, requirementId);
        RegulationEntity requirement = ensureRegulationNode(requirementId, RegulationNodeType.REQUIREMENT);
        RegulationEntity regulation = requirement.getParentId() == null
                ? null
                : regulationRepository.findById(requirement.getParentId()).orElse(null);

        ControlRequirementLinkEntity entity = ControlRequirementLinkEntity.builder()
                .controlAssignmentId(controlAssignmentId)
                .requirementId(requirementId)
                .regulationId(requirement.getParentId())
                .code(requirement.getCode())
                .title(requirement.getTitle())
                .description(requirement.getDescription())
                .regulationTitle(regulation == null ? null : regulation.getTitle())
                .validFrom(requirement.getEffectiveDate())
                .validTo(requirement.getValidTo())
                .build();
        ControlRequirementLinkEntity saved = requirementLinkRepository.save(entity);
        audit("CONTROL_REQUIREMENT_LINKED", saved.getId(), httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
        return toRequirementLinkDto(saved);
    }

    @Transactional
    public void deleteRequirementLink(UUID controlAssignmentId, UUID linkId, HttpServletRequest httpRequest) {
        ensureAssignment(controlAssignmentId);
        ControlRequirementLinkEntity entity = requirementLinkRepository.findByIdAndControlAssignmentId(linkId, controlAssignmentId)
                .orElseThrow(() -> notFound("Control requirement link not found: " + linkId, linkId));
        requirementLinkRepository.delete(entity);
        audit("CONTROL_REQUIREMENT_UNLINKED", linkId, httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
    }

    public List<ControlRiskLinkDto> listRisks(UUID controlAssignmentId) {
        ensureAssignment(controlAssignmentId);
        return riskLinkRepository.findByControlAssignmentIdOrderByCreatedAtAsc(controlAssignmentId)
                .stream()
                .map(this::toRiskLinkDto)
                .toList();
    }

    @Transactional
    public ControlRiskLinkDto linkRisk(UUID controlAssignmentId, UUID riskId, HttpServletRequest httpRequest) {
        ensureAssignment(controlAssignmentId);
        ensureNoRiskDuplicate(controlAssignmentId, riskId);
        RiskNodeEntity risk = riskNodeRepository.findById(riskId)
                .orElseThrow(() -> notFound("Risk not found: " + riskId, riskId));

        ControlRiskLinkEntity entity = ControlRiskLinkEntity.builder()
                .controlAssignmentId(controlAssignmentId)
                .riskId(riskId)
                .code(risk.getCode())
                .title(risk.getTitle())
                .description(risk.getDescription())
                .source(risk.getRiskType())
                .organizationTitle(null)
                .validFrom(risk.getValidFrom())
                .validTo(risk.getValidTo())
                .build();
        ControlRiskLinkEntity saved = riskLinkRepository.save(entity);
        audit("CONTROL_RISK_LINKED", saved.getId(), httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
        return toRiskLinkDto(saved);
    }

    @Transactional
    public void deleteRiskLink(UUID controlAssignmentId, UUID linkId, HttpServletRequest httpRequest) {
        ensureAssignment(controlAssignmentId);
        ControlRiskLinkEntity entity = riskLinkRepository.findByIdAndControlAssignmentId(linkId, controlAssignmentId)
                .orElseThrow(() -> notFound("Control risk link not found: " + linkId, linkId));
        riskLinkRepository.delete(entity);
        audit("CONTROL_RISK_UNLINKED", linkId, httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
    }

    public List<ControlAccountGroupLinkDto> listAccountGroups(UUID controlAssignmentId) {
        ensureAssignment(controlAssignmentId);
        return accountGroupLinkRepository.findByControlAssignmentIdOrderByCreatedAtAsc(controlAssignmentId)
                .stream()
                .map(this::toAccountGroupLinkDto)
                .toList();
    }

    @Transactional
    public ControlAccountGroupLinkDto linkAccountGroup(
            UUID controlAssignmentId,
            UUID accountGroupId,
            HttpServletRequest httpRequest
    ) {
        ensureAssignment(controlAssignmentId);
        ensureNoAccountGroupDuplicate(controlAssignmentId, accountGroupId);
        AccountGroupEntity accountGroup = accountGroupRepository.findById(accountGroupId)
                .orElseThrow(() -> notFound("Account group not found: " + accountGroupId, accountGroupId));

        ControlAccountGroupLinkEntity entity = ControlAccountGroupLinkEntity.builder()
                .controlAssignmentId(controlAssignmentId)
                .accountGroupId(accountGroupId)
                .code(accountGroup.getCode())
                .title(accountGroup.getTitle())
                .description(accountGroup.getDescription())
                .assertionType(resolveAssertionType(accountGroup))
                .build();
        ControlAccountGroupLinkEntity saved = accountGroupLinkRepository.save(entity);
        audit("CONTROL_ACCOUNT_GROUP_LINKED", saved.getId(), httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
        return toAccountGroupLinkDto(saved);
    }

    @Transactional
    public void deleteAccountGroupLink(UUID controlAssignmentId, UUID linkId, HttpServletRequest httpRequest) {
        ensureAssignment(controlAssignmentId);
        ControlAccountGroupLinkEntity entity = accountGroupLinkRepository.findByIdAndControlAssignmentId(linkId, controlAssignmentId)
                .orElseThrow(() -> notFound("Control account group link not found: " + linkId, linkId));
        accountGroupLinkRepository.delete(entity);
        audit("CONTROL_ACCOUNT_GROUP_UNLINKED", linkId, httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
    }

    public List<ControlDocumentDto> listDocuments(UUID controlAssignmentId) {
        ensureAssignment(controlAssignmentId);
        return documentRepository.findByControlAssignmentIdOrderByCreatedAtAsc(controlAssignmentId)
                .stream()
                .map(this::toDocumentDto)
                .toList();
    }

    @Transactional
    public ControlDocumentDto createDocument(
            UUID controlAssignmentId,
            CreateControlDocumentRequest request,
            HttpServletRequest httpRequest
    ) {
        ensureAssignment(controlAssignmentId);
        ControlDocumentEntity entity = ControlDocumentEntity.builder()
                .controlAssignmentId(controlAssignmentId)
                .build();
        applyDocument(request.name(), request.documentType(), request.description(), request.fileRef(), entity);
        ControlDocumentEntity saved = documentRepository.save(entity);
        audit("CONTROL_DOCUMENT_CREATED", saved.getId(), httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
        return toDocumentDto(saved);
    }

    @Transactional
    public ControlDocumentDto updateDocument(
            UUID controlAssignmentId,
            UUID documentId,
            UpdateControlDocumentRequest request,
            HttpServletRequest httpRequest
    ) {
        ensureAssignment(controlAssignmentId);
        ControlDocumentEntity entity = documentRepository.findByIdAndControlAssignmentId(documentId, controlAssignmentId)
                .orElseThrow(() -> notFound("Control document not found: " + documentId, documentId));
        applyDocument(request.name(), request.documentType(), request.description(), request.fileRef(), entity);
        ControlDocumentEntity saved = documentRepository.save(entity);
        audit("CONTROL_DOCUMENT_UPDATED", saved.getId(), httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
        return toDocumentDto(saved);
    }

    @Transactional
    public void deleteDocument(UUID controlAssignmentId, UUID documentId, HttpServletRequest httpRequest) {
        ensureAssignment(controlAssignmentId);
        ControlDocumentEntity entity = documentRepository.findByIdAndControlAssignmentId(documentId, controlAssignmentId)
                .orElseThrow(() -> notFound("Control document not found: " + documentId, documentId));
        documentRepository.delete(entity);
        audit("CONTROL_DOCUMENT_DELETED", documentId, httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
    }

    public List<ControlPerformancePlanDto> listPerformancePlans(UUID controlAssignmentId) {
        ensureAssignment(controlAssignmentId);
        return performancePlanRepository
                .findByControlAssignmentIdOrderByPlannedDateAscCreatedAtAsc(controlAssignmentId)
                .stream()
                .map(this::toPerformancePlanDto)
                .toList();
    }

    @Transactional
    public ControlPerformancePlanDto createPerformancePlan(
            UUID controlAssignmentId,
            CreateControlPerformancePlanRequest request,
            HttpServletRequest httpRequest
    ) {
        ensureAssignment(controlAssignmentId);
        ControlPerformancePlanEntity entity = ControlPerformancePlanEntity.builder()
                .controlAssignmentId(controlAssignmentId)
                .build();
        applyPerformancePlan(request.title(), request.description(), request.frequency(), request.ownerName(),
                request.plannedDate(), request.status(), entity);
        ControlPerformancePlanEntity saved = performancePlanRepository.save(entity);
        audit("CONTROL_PERFORMANCE_PLAN_CREATED", saved.getId(), httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
        return toPerformancePlanDto(saved);
    }

    @Transactional
    public ControlPerformancePlanDto updatePerformancePlan(
            UUID controlAssignmentId,
            UUID planId,
            UpdateControlPerformancePlanRequest request,
            HttpServletRequest httpRequest
    ) {
        ensureAssignment(controlAssignmentId);
        ControlPerformancePlanEntity entity = performancePlanRepository.findByIdAndControlAssignmentId(planId, controlAssignmentId)
                .orElseThrow(() -> notFound("Control performance plan not found: " + planId, planId));
        applyPerformancePlan(request.title(), request.description(), request.frequency(), request.ownerName(),
                request.plannedDate(), request.status(), entity);
        ControlPerformancePlanEntity saved = performancePlanRepository.save(entity);
        audit("CONTROL_PERFORMANCE_PLAN_UPDATED", saved.getId(), httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
        return toPerformancePlanDto(saved);
    }

    @Transactional
    public void deletePerformancePlan(UUID controlAssignmentId, UUID planId, HttpServletRequest httpRequest) {
        ensureAssignment(controlAssignmentId);
        ControlPerformancePlanEntity entity = performancePlanRepository.findByIdAndControlAssignmentId(planId, controlAssignmentId)
                .orElseThrow(() -> notFound("Control performance plan not found: " + planId, planId));
        performancePlanRepository.delete(entity);
        audit("CONTROL_PERFORMANCE_PLAN_DELETED", planId, httpRequest, Map.of("controlAssignmentId", controlAssignmentId));
    }

    private void applyStep(
            String title,
            String description,
            String requiredDocument,
            String requiredNote,
            String sensitivity,
            Integer sortOrder,
            ControlStepEntity entity
    ) {
        entity.setTitle(normalizeRequired(title));
        entity.setDescription(normalizeNullable(description));
        entity.setRequiredDocument(normalizeNullable(requiredDocument));
        entity.setRequiredNote(normalizeNullable(requiredNote));
        entity.setSensitivity(normalizeNullable(sensitivity));
        entity.setSortOrder(sortOrder);
    }

    private void applyDocument(
            String name,
            String documentType,
            String description,
            String fileRef,
            ControlDocumentEntity entity
    ) {
        entity.setName(normalizeRequired(name));
        entity.setDocumentType(normalizeNullable(documentType));
        entity.setDescription(normalizeNullable(description));
        entity.setFileRef(normalizeNullable(fileRef));
    }

    private void applyPerformancePlan(
            String title,
            String description,
            String frequency,
            String ownerName,
            java.time.LocalDate plannedDate,
            String status,
            ControlPerformancePlanEntity entity
    ) {
        entity.setTitle(normalizeRequired(title));
        entity.setDescription(normalizeNullable(description));
        entity.setFrequency(normalizeNullable(frequency));
        entity.setOwnerName(normalizeNullable(ownerName));
        entity.setPlannedDate(plannedDate);
        entity.setStatus(normalizeNullable(status));
    }

    private void ensureAssignment(UUID controlAssignmentId) {
        if (!assignmentRepository.existsById(controlAssignmentId)) {
            throw notFound("Control assignment not found: " + controlAssignmentId, controlAssignmentId);
        }
    }

    private RegulationEntity ensureRegulationNode(UUID id, RegulationNodeType nodeType) {
        RegulationEntity entity = regulationRepository.findById(id)
                .orElseThrow(() -> notFound("Regulation node not found: " + id, id));
        if (entity.getNodeType() != nodeType) {
            throw new ConflictException(
                    "MASTER_DATA_INVALID_REFERENCE",
                    "error.masterdata.invalidParent",
                    "Invalid regulation node type for control link: " + id,
                    id
            );
        }
        return entity;
    }

    private void ensureNoRegulationDuplicate(UUID controlAssignmentId, UUID regulationId) {
        regulationLinkRepository.findByControlAssignmentIdAndRegulationId(controlAssignmentId, regulationId)
                .ifPresent(existing -> duplicate("Control regulation link already exists", regulationId));
    }

    private void ensureNoRequirementDuplicate(UUID controlAssignmentId, UUID requirementId) {
        requirementLinkRepository.findByControlAssignmentIdAndRequirementId(controlAssignmentId, requirementId)
                .ifPresent(existing -> duplicate("Control requirement link already exists", requirementId));
    }

    private void ensureNoRiskDuplicate(UUID controlAssignmentId, UUID riskId) {
        riskLinkRepository.findByControlAssignmentIdAndRiskId(controlAssignmentId, riskId)
                .ifPresent(existing -> duplicate("Control risk link already exists", riskId));
    }

    private void ensureNoAccountGroupDuplicate(UUID controlAssignmentId, UUID accountGroupId) {
        accountGroupLinkRepository.findByControlAssignmentIdAndAccountGroupId(controlAssignmentId, accountGroupId)
                .ifPresent(existing -> duplicate("Control account group link already exists", accountGroupId));
    }

    private void duplicate(String message, UUID id) {
        throw new ConflictException(
                "MASTER_DATA_DUPLICATE_ASSIGNMENT",
                "error.masterdata.duplicateAssignment",
                message + ": " + id,
                id
        );
    }

    private String resolveAssertionType(AccountGroupEntity accountGroup) {
        List<String> assertions = new java.util.ArrayList<>();
        if (Boolean.TRUE.equals(accountGroup.getAssertionExistence())) {
            assertions.add("existence");
        }
        if (Boolean.TRUE.equals(accountGroup.getAssertionCompleteness())) {
            assertions.add("completeness");
        }
        if (Boolean.TRUE.equals(accountGroup.getAssertionValuation())) {
            assertions.add("valuation");
        }
        if (Boolean.TRUE.equals(accountGroup.getAssertionDisclosure())) {
            assertions.add("disclosure");
        }
        return assertions.isEmpty() ? null : String.join(",", assertions);
    }

    private ControlStepDto toStepDto(ControlStepEntity entity) {
        return new ControlStepDto(
                entity.getId(),
                entity.getControlAssignmentId(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getRequiredDocument(),
                entity.getRequiredNote(),
                entity.getSensitivity(),
                entity.getSortOrder(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private ControlRegulationLinkDto toRegulationLinkDto(ControlRegulationLinkEntity entity) {
        return new ControlRegulationLinkDto(
                entity.getId(),
                entity.getControlAssignmentId(),
                entity.getRegulationId(),
                entity.getCode(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getValidFrom(),
                entity.getValidTo(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private ControlRequirementLinkDto toRequirementLinkDto(ControlRequirementLinkEntity entity) {
        return new ControlRequirementLinkDto(
                entity.getId(),
                entity.getControlAssignmentId(),
                entity.getRequirementId(),
                entity.getRegulationId(),
                entity.getCode(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getRegulationTitle(),
                entity.getValidFrom(),
                entity.getValidTo(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private ControlRiskLinkDto toRiskLinkDto(ControlRiskLinkEntity entity) {
        return new ControlRiskLinkDto(
                entity.getId(),
                entity.getControlAssignmentId(),
                entity.getRiskId(),
                entity.getCode(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getSource(),
                entity.getOrganizationTitle(),
                entity.getValidFrom(),
                entity.getValidTo(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private ControlAccountGroupLinkDto toAccountGroupLinkDto(ControlAccountGroupLinkEntity entity) {
        return new ControlAccountGroupLinkDto(
                entity.getId(),
                entity.getControlAssignmentId(),
                entity.getAccountGroupId(),
                entity.getCode(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getAssertionType(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private ControlDocumentDto toDocumentDto(ControlDocumentEntity entity) {
        return new ControlDocumentDto(
                entity.getId(),
                entity.getControlAssignmentId(),
                entity.getName(),
                entity.getDocumentType(),
                entity.getDescription(),
                entity.getFileRef(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private ControlPerformancePlanDto toPerformancePlanDto(ControlPerformancePlanEntity entity) {
        return new ControlPerformancePlanDto(
                entity.getId(),
                entity.getControlAssignmentId(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getFrequency(),
                entity.getOwnerName(),
                entity.getPlannedDate(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private NotFoundException notFound(String developerMessage, UUID id) {
        return new NotFoundException(
                "MASTER_DATA_NOT_FOUND",
                "error.masterdata.notFound",
                developerMessage,
                id
        );
    }

    private void audit(String eventName, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        Map<String, Object> safeDetails = new LinkedHashMap<>();
        safeDetails.put("event", eventName);
        safeDetails.putAll(details);
        auditService.log(
                AuditEventType.MASTER_DATA_CHANGED,
                AuditTargetType.CONTROL_ASSIGNMENT,
                targetId.toString(),
                ActionResult.SUCCESS,
                currentUserProvider.getCurrentUserIdOrNull(),
                request,
                safeDetails
        );
        log.debug("Control assignment tab changed. event={}, targetId={}", eventName, targetId);
    }
}
