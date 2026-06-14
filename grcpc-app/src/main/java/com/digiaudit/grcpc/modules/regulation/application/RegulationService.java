package com.digiaudit.grcpc.modules.regulation.application;

import static com.digiaudit.grcpc.common.util.Dates.*;
import static com.digiaudit.grcpc.common.util.Texts.*;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessRegulationAssignmentRepository;
import com.digiaudit.grcpc.modules.regulation.api.dto.CreateRegulationRequest;
import com.digiaudit.grcpc.modules.regulation.api.dto.RegulationResponse;
import com.digiaudit.grcpc.modules.regulation.api.dto.UpdateRegulationRequest;
import com.digiaudit.grcpc.modules.regulation.api.dto.UpdateRegulationStatusRequest;
import com.digiaudit.grcpc.modules.regulation.domain.entity.RegulationEntity;
import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationNodeType;
import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationStatus;
import com.digiaudit.grcpc.modules.regulation.domain.repository.RegulationRepository;
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
public class RegulationService {

    private final RegulationRepository regulationRepository;
    private final ProcessRegulationAssignmentRepository processRegulationAssignmentRepository;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<RegulationResponse> findAll() {
        return regulationRepository.findAllByOrderBySortOrderAscTitleAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<RegulationResponse> findAll(RegulationNodeType nodeType) {
        return nodeType == null ? findAll() : findByNodeType(nodeType);
    }

    public List<RegulationResponse> findByNodeType(RegulationNodeType nodeType) {
        return regulationRepository.findByNodeTypeOrderBySortOrderAscTitleAsc(nodeType)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<RegulationResponse> findRoots() {
        return regulationRepository.findByParentIdIsNullOrderBySortOrderAscTitleAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<RegulationResponse> findChildren(UUID parentId) {
        ensureExists(parentId);
        return regulationRepository.findByParentIdOrderBySortOrderAscTitleAsc(parentId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public RegulationResponse findById(UUID id) {
        return toResponse(getEntity(id));
    }

    @Transactional
    public RegulationResponse create(CreateRegulationRequest request, HttpServletRequest httpRequest) {
        validateCodeUniqueness(request.code(), null);
        validateParentAndTypeForCreate(request.parentId(), request.nodeType());

        RegulationEntity entity = fill(
                RegulationEntity.builder().build(),
                request.code(),
                request.title(),
                request.parentId(),
                request.nodeType(),
                request.status(),
                request.sortOrder(),
                request.description(),
                request.effectiveDate(),
                request.validTo(),
                request.issuer(),
                request.ownerName(),
                request.documentsCount()
        );

        RegulationEntity saved = regulationRepository.save(entity);
        audit("REGULATION_CREATED", saved.getId(), httpRequest, Map.of("code", saved.getCode()));
        log.info("Regulation node created. id={}, code={}, type={}", saved.getId(), saved.getCode(), saved.getNodeType());
        return toResponse(saved);
    }

    @Transactional
    public RegulationResponse update(UUID id, UpdateRegulationRequest request, HttpServletRequest httpRequest) {
        RegulationEntity entity = getEntity(id);

        String targetCode = request.code() == null ? entity.getCode() : request.code();
        String targetTitle = request.title() == null ? entity.getTitle() : request.title();
        RegulationNodeType targetNodeType = request.nodeType() == null ? entity.getNodeType() : request.nodeType();
        RegulationStatus targetStatus = request.status() == null ? entity.getStatus() : request.status();

        validateCodeUniqueness(targetCode, id);
        validateParentAndTypeForUpdate(id, request.parentId(), targetNodeType);

        RegulationEntity saved = regulationRepository.save(fill(
                entity,
                targetCode,
                targetTitle,
                request.parentId(),
                targetNodeType,
                targetStatus,
                request.sortOrder(),
                request.description(),
                request.effectiveDate(),
                request.validTo(),
                request.issuer(),
                request.ownerName(),
                request.documentsCount()
        ));

        audit("REGULATION_UPDATED", saved.getId(), httpRequest, Map.of("code", saved.getCode()));
        log.info("Regulation node updated. id={}", saved.getId());
        return toResponse(saved);
    }

    @Transactional
    public RegulationResponse updateStatus(UUID id, UpdateRegulationStatusRequest request, HttpServletRequest httpRequest) {
        RegulationEntity entity = getEntity(id);
        entity.setStatus(request.status());
        RegulationEntity saved = regulationRepository.save(entity);
        audit("REGULATION_UPDATED", saved.getId(), httpRequest, Map.of("status", saved.getStatus()));
        log.info("Regulation status updated. id={}, status={}", saved.getId(), saved.getStatus());
        return toResponse(saved);
    }

    @Transactional
    public RegulationResponse toggleStatus(UUID id, HttpServletRequest httpRequest) {
        RegulationEntity entity = getEntity(id);
        entity.setStatus(entity.getStatus() == RegulationStatus.ACTIVE
                ? RegulationStatus.INACTIVE
                : RegulationStatus.ACTIVE);
        RegulationEntity saved = regulationRepository.save(entity);
        audit("REGULATION_UPDATED", saved.getId(), httpRequest, Map.of("status", saved.getStatus()));
        log.info("Regulation status toggled. id={}, status={}", saved.getId(), saved.getStatus());
        return toResponse(saved);
    }

    @Transactional
    public void delete(UUID id, HttpServletRequest httpRequest) {
        RegulationEntity entity = getEntity(id);
        if (regulationRepository.existsByParentId(id) || processRegulationAssignmentRepository.existsByRegulationNodeId(id)) {
            throw new ConflictException(
                    "MASTER_DATA_HAS_CHILDREN",
                    "error.masterdata.hasChildren",
                    "Regulation node has children or assignments: " + id,
                    id
            );
        }
        regulationRepository.delete(entity);
        audit("REGULATION_DELETED", id, httpRequest, Map.of("code", entity.getCode()));
        log.info("Regulation node deleted. id={}", id);
    }

    private RegulationEntity fill(
            RegulationEntity entity,
            String code,
            String title,
            UUID parentId,
            RegulationNodeType nodeType,
            RegulationStatus status,
            Integer sortOrder,
            String description,
            String effectiveDateText,
            String validToText,
            String issuer,
            String ownerName,
            Integer documentsCount
    ) {
        LocalDate effectiveDate = parseNullable(effectiveDateText);
        LocalDate validTo = parseNullable(validToText);
        requireValidRange(effectiveDate, validTo, "Regulation validTo cannot be before effectiveDate");

        entity.setCode(normalizeRequired(code));
        entity.setTitle(normalizeRequired(title));
        entity.setParentId(parentId);
        entity.setNodeType(nodeType);
        entity.setStatus(status == null ? RegulationStatus.ACTIVE : status);
        entity.setSortOrder(sortOrder);
        entity.setDescription(normalizeNullable(description));
        entity.setEffectiveDate(effectiveDate);
        entity.setValidTo(validTo);
        entity.setIssuer(normalizeNullable(issuer));
        entity.setOwnerName(normalizeNullable(ownerName));
        entity.setDocumentsCount(defaultZero(documentsCount));
        return entity;
    }

    private void ensureExists(UUID id) {
        if (!regulationRepository.existsById(id)) {
            throw notFound(id);
        }
    }

    private RegulationEntity getEntity(UUID id) {
        return regulationRepository.findById(id).orElseThrow(() -> notFound(id));
    }

    private void validateCodeUniqueness(String code, UUID currentId) {
        String normalizedCode = normalizeRequired(code);
        boolean exists = currentId == null
                ? regulationRepository.existsByCodeIgnoreCase(normalizedCode)
                : regulationRepository.existsByCodeIgnoreCaseAndIdNot(normalizedCode, currentId);
        if (exists) {
            throw new ConflictException(
                    "MASTER_DATA_DUPLICATE_CODE",
                    "error.masterdata.duplicateCode",
                    "Duplicate regulation code: " + normalizedCode,
                    normalizedCode
            );
        }
    }

    private void validateParentAndTypeForCreate(UUID parentId, RegulationNodeType nodeType) {
        if (parentId == null) {
            if (nodeType != RegulationNodeType.GROUP) {
                throw invalidParent(parentId);
            }
            return;
        }
        RegulationEntity parent = regulationRepository.findById(parentId).orElseThrow(() -> invalidParent(parentId));
        validateNodeHierarchy(parent.getNodeType(), nodeType);
    }

    private void validateParentAndTypeForUpdate(UUID id, UUID parentId, RegulationNodeType nodeType) {
        if (parentId == null) {
            if (nodeType != RegulationNodeType.GROUP) {
                throw invalidParent(parentId);
            }
            return;
        }
        if (id.equals(parentId)) {
            throw invalidParent(parentId);
        }
        RegulationEntity parent = regulationRepository.findById(parentId).orElseThrow(() -> invalidParent(parentId));
        validateNodeHierarchy(parent.getNodeType(), nodeType);

        UUID current = parentId;
        while (current != null) {
            RegulationEntity node = getEntity(current);
            if (id.equals(node.getId())) {
                throw invalidParent(parentId);
            }
            current = node.getParentId();
        }
    }

    private void validateNodeHierarchy(RegulationNodeType parentType, RegulationNodeType childType) {
        boolean valid = switch (parentType) {
            case GROUP -> childType == RegulationNodeType.GROUP || childType == RegulationNodeType.LAW;
            case LAW -> childType == RegulationNodeType.REQUIREMENT;
            case REQUIREMENT -> false;
        };
        if (!valid) {
            throw invalidParent(null);
        }
    }

    private RegulationResponse toResponse(RegulationEntity entity) {
        return RegulationResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .title(entity.getTitle())
                .parentId(entity.getParentId())
                .nodeType(entity.getNodeType())
                .status(entity.getStatus())
                .description(entity.getDescription())
                .sortOrder(entity.getSortOrder())
                .effectiveDate(entity.getEffectiveDate())
                .validTo(entity.getValidTo())
                .effectiveFrom(entity.getEffectiveDate())
                .effectiveTo(entity.getValidTo())
                .issuer(entity.getIssuer())
                .ownerName(entity.getOwnerName())
                .documentsCount(defaultZero(entity.getDocumentsCount()))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private NotFoundException notFound(UUID id) {
        return new NotFoundException(
                "MASTER_DATA_NOT_FOUND",
                "error.masterdata.notFound",
                "Regulation node not found: " + id,
                id
        );
    }

    private ConflictException invalidParent(UUID parentId) {
        return new ConflictException(
                "MASTER_DATA_INVALID_PARENT",
                "error.masterdata.invalidParent",
                "Invalid regulation parent: " + parentId,
                parentId
        );
    }

    private int defaultZero(Integer value) {
        return value == null ? 0 : value;
    }

    private void audit(String eventName, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        Map<String, Object> safeDetails = new LinkedHashMap<>();
        safeDetails.put("event", eventName);
        safeDetails.putAll(details);
        auditService.log(
                AuditEventType.MASTER_DATA_CHANGED,
                AuditTargetType.REGULATION,
                targetId.toString(),
                ActionResult.SUCCESS,
                currentUserProvider.getCurrentUserIdOrNull(),
                request,
                safeDetails
        );
    }
}
