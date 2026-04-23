package com.digiaudit.grcpc.modules.regulation.application;

import com.digiaudit.grcpc.modules.regulation.api.dto.*;
import com.digiaudit.grcpc.modules.regulation.domain.entity.RegulationEntity;
import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationNodeType;
import com.digiaudit.grcpc.modules.regulation.domain.repository.RegulationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RegulationService {

    private final RegulationRepository regulationRepository;

    public List<RegulationResponse> findAll() {
        return regulationRepository.findAllByOrderByTitleAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<RegulationResponse> findRoots() {
        return regulationRepository.findByParentIdIsNullOrderByTitleAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<RegulationResponse> findChildren(UUID parentId) {
        ensureExists(parentId);
        return regulationRepository.findByParentIdOrderByTitleAsc(parentId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public RegulationResponse findById(UUID id) {
        return toResponse(getEntity(id));
    }

    @Transactional
    public RegulationResponse create(CreateRegulationRequest request) {
        validateCodeUniqueness(request.code(), null);
        validateParentAndTypeForCreate(request.parentId(), request.nodeType());
        validateDateRange(request.effectiveFrom(), request.effectiveTo());

        RegulationEntity entity = RegulationEntity.builder()
                .code(normalize(request.code()))
                .title(normalize(request.title()))
                .parentId(request.parentId())
                .nodeType(request.nodeType())
                .status(request.status())
                .description(normalizeNullable(request.description()))
                .effectiveFrom(request.effectiveFrom())
                .effectiveTo(request.effectiveTo())
                .build();

        RegulationEntity saved = regulationRepository.save(entity);
        log.info("Regulation node created. id={}, code={}, type={}", saved.getId(), saved.getCode(), saved.getNodeType());
        return toResponse(saved);
    }

    @Transactional
    public RegulationResponse update(UUID id, UpdateRegulationRequest request) {
        RegulationEntity entity = getEntity(id);

        if (request.code() != null) {
            validateCodeUniqueness(request.code(), id);
            entity.setCode(normalize(request.code()));
        }
        if (request.title() != null) {
            entity.setTitle(normalize(request.title()));
        }

        RegulationNodeType targetNodeType = request.nodeType() != null ? request.nodeType() : entity.getNodeType();
        UUID targetParentId = request.parentId();
        validateParentAndTypeForUpdate(id, targetParentId, targetNodeType);
        entity.setParentId(targetParentId);
        entity.setNodeType(targetNodeType);

        if (request.status() != null) {
            entity.setStatus(request.status());
        }
        if (request.description() != null) {
            entity.setDescription(normalizeNullable(request.description()));
        }

        entity.setEffectiveFrom(request.effectiveFrom());
        entity.setEffectiveTo(request.effectiveTo());
        validateDateRange(entity.getEffectiveFrom(), entity.getEffectiveTo());

        RegulationEntity saved = regulationRepository.save(entity);
        log.info("Regulation node updated. id={}", saved.getId());
        return toResponse(saved);
    }

    @Transactional
    public RegulationResponse updateStatus(UUID id, UpdateRegulationStatusRequest request) {
        RegulationEntity entity = getEntity(id);
        entity.setStatus(request.status());
        RegulationEntity saved = regulationRepository.save(entity);
        log.info("Regulation status updated. id={}, status={}", saved.getId(), saved.getStatus());
        return toResponse(saved);
    }

    @Transactional
    public void delete(UUID id) {
        RegulationEntity entity = getEntity(id);
        if (regulationRepository.existsByParentId(id)) {
            throw new IllegalStateException("Cannot delete regulation node with child nodes");
        }
        regulationRepository.delete(entity);
        log.info("Regulation node deleted. id={}", id);
    }

    private void ensureExists(UUID id) {
        if (!regulationRepository.existsById(id)) {
            throw new EntityNotFoundException("Regulation node not found: " + id);
        }
    }

    private RegulationEntity getEntity(UUID id) {
        return regulationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Regulation node not found: " + id));
    }

    private void validateCodeUniqueness(String code, UUID currentId) {
        String normalizedCode = normalize(code);
        boolean exists = currentId == null
                ? regulationRepository.existsByCodeIgnoreCase(normalizedCode)
                : regulationRepository.existsByCodeIgnoreCaseAndIdNot(normalizedCode, currentId);
        if (exists) {
            throw new IllegalArgumentException("Regulation code already exists: " + normalizedCode);
        }
    }

    private void validateParentAndTypeForCreate(UUID parentId, RegulationNodeType nodeType) {
        if (parentId == null) {
            if (nodeType != RegulationNodeType.GROUP) {
                throw new IllegalArgumentException("Only GROUP nodes can be created at root level");
            }
            return;
        }
        RegulationEntity parent = getEntity(parentId);
        validateNodeHierarchy(parent.getNodeType(), nodeType);
    }

    private void validateParentAndTypeForUpdate(UUID id, UUID parentId, RegulationNodeType nodeType) {
        if (parentId == null) {
            if (nodeType != RegulationNodeType.GROUP) {
                throw new IllegalArgumentException("Only GROUP nodes can be moved to root level");
            }
            return;
        }
        if (id.equals(parentId)) {
            throw new IllegalArgumentException("Regulation node cannot be parent of itself");
        }
        RegulationEntity parent = getEntity(parentId);
        validateNodeHierarchy(parent.getNodeType(), nodeType);

        UUID current = parentId;
        while (current != null) {
            RegulationEntity node = getEntity(current);
            if (id.equals(node.getId())) {
                throw new IllegalArgumentException("Cyclic regulation hierarchy is not allowed");
            }
            current = node.getParentId();
        }
    }

    private void validateNodeHierarchy(RegulationNodeType parentType, RegulationNodeType childType) {
        boolean valid = switch (parentType) {
            case GROUP -> childType == RegulationNodeType.LAW;
            case LAW -> childType == RegulationNodeType.REQUIREMENT;
            case REQUIREMENT -> false;
        };
        if (!valid) {
            throw new IllegalArgumentException("Invalid regulation hierarchy. parentType=" + parentType + ", childType=" + childType);
        }
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from != null && to != null && to.isBefore(from)) {
            throw new IllegalArgumentException("Regulation effectiveTo cannot be before effectiveFrom");
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
                .effectiveFrom(entity.getEffectiveFrom())
                .effectiveTo(entity.getEffectiveTo())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private String normalize(String value) {
        String result = normalizeNullable(value);
        if (!StringUtils.hasText(result)) {
            throw new IllegalArgumentException("Value must not be blank");
        }
        return result;
    }

    private String normalizeNullable(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
