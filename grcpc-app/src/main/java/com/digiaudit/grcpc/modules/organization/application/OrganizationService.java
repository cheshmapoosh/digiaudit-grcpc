package com.digiaudit.grcpc.modules.organization.application;

import com.digiaudit.grcpc.modules.organization.api.dto.*;
import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationEntity;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrganizationService {

    private final OrganizationRepository organizationRepository;

    public List<OrganizationResponse> findAll() {
        return organizationRepository.findAllByOrderByNameAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<OrganizationResponse> findRoots() {
        return organizationRepository.findByParentIdIsNullOrderByNameAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<OrganizationResponse> findChildren(UUID parentId) {
        ensureExists(parentId);
        return organizationRepository.findByParentIdOrderByNameAsc(parentId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public OrganizationResponse findById(UUID id) {
        return toResponse(getEntity(id));
    }

    @Transactional
    public OrganizationResponse create(CreateOrganizationRequest request) {
        validateCodeUniqueness(request.code(), null);
        validateParentExists(request.parentId());
        validateDateRange(request.validFrom(), request.validTo());

        OrganizationEntity entity = OrganizationEntity.builder()
                .code(normalize(request.code()))
                .name(normalize(request.name()))
                .parentId(request.parentId())
                .type(request.type())
                .status(request.status())
                .location(normalizeNullable(request.location()))
                .description(normalizeNullable(request.description()))
                .validFrom(request.validFrom())
                .validTo(request.validTo())
                .build();

        OrganizationEntity saved = organizationRepository.save(entity);
        log.info("Organization created. id={}, code={}", saved.getId(), saved.getCode());
        return toResponse(saved);
    }

    @Transactional
    public OrganizationResponse update(UUID id, UpdateOrganizationRequest request) {
        OrganizationEntity entity = getEntity(id);

        if (request.code() != null) {
            validateCodeUniqueness(request.code(), id);
            entity.setCode(normalize(request.code()));
        }
        if (request.name() != null) {
            entity.setName(normalize(request.name()));
        }
        if (request.parentId() != null || request.parentId() == null) {
            validateParentForUpdate(id, request.parentId());
            entity.setParentId(request.parentId());
        }
        if (request.type() != null) {
            entity.setType(request.type());
        }
        if (request.status() != null) {
            entity.setStatus(request.status());
        }
        if (request.location() != null) {
            entity.setLocation(normalizeNullable(request.location()));
        }
        if (request.description() != null) {
            entity.setDescription(normalizeNullable(request.description()));
        }

        // allow clearing or setting dates
        entity.setValidFrom(request.validFrom());
        entity.setValidTo(request.validTo());
        validateDateRange(entity.getValidFrom(), entity.getValidTo());

        OrganizationEntity saved = organizationRepository.save(entity);
        log.info("Organization updated. id={}", saved.getId());
        return toResponse(saved);
    }

    @Transactional
    public OrganizationResponse updateStatus(UUID id, UpdateOrganizationStatusRequest request) {
        OrganizationEntity entity = getEntity(id);
        entity.setStatus(request.status());
        OrganizationEntity saved = organizationRepository.save(entity);
        log.info("Organization status updated. id={}, status={}", saved.getId(), saved.getStatus());
        return toResponse(saved);
    }

    @Transactional
    public void delete(UUID id) {
        OrganizationEntity entity = getEntity(id);
        if (organizationRepository.existsByParentId(id)) {
            throw new IllegalStateException("Cannot delete organization with child organizations");
        }
        organizationRepository.delete(entity);
        log.info("Organization deleted. id={}", id);
    }

    private void ensureExists(UUID id) {
        if (!organizationRepository.existsById(id)) {
            throw new EntityNotFoundException("Organization not found: " + id);
        }
    }

    private OrganizationEntity getEntity(UUID id) {
        return organizationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Organization not found: " + id));
    }

    private void validateCodeUniqueness(String code, UUID currentId) {
        String normalizedCode = normalize(code);
        boolean exists = currentId == null
                ? organizationRepository.existsByCodeIgnoreCase(normalizedCode)
                : organizationRepository.existsByCodeIgnoreCaseAndIdNot(normalizedCode, currentId);
        if (exists) {
            throw new IllegalArgumentException("Organization code already exists: " + normalizedCode);
        }
    }

    private void validateParentExists(UUID parentId) {
        if (parentId != null && !organizationRepository.existsById(parentId)) {
            throw new EntityNotFoundException("Parent organization not found: " + parentId);
        }
    }

    private void validateParentForUpdate(UUID id, UUID parentId) {
        if (parentId == null) {
            return;
        }
        if (id.equals(parentId)) {
            throw new IllegalArgumentException("Organization cannot be parent of itself");
        }
        validateParentExists(parentId);
        UUID current = parentId;
        while (current != null) {
            OrganizationEntity parent = getEntity(current);
            if (id.equals(parent.getId())) {
                throw new IllegalArgumentException("Cyclic organization hierarchy is not allowed");
            }
            current = parent.getParentId();
        }
    }

    private void validateDateRange(java.time.LocalDate validFrom, java.time.LocalDate validTo) {
        if (validFrom != null && validTo != null && validTo.isBefore(validFrom)) {
            throw new IllegalArgumentException("Organization validTo cannot be before validFrom");
        }
    }

    private OrganizationResponse toResponse(OrganizationEntity entity) {
        return OrganizationResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .parentId(entity.getParentId())
                .type(entity.getType())
                .status(entity.getStatus())
                .location(entity.getLocation())
                .description(entity.getDescription())
                .validFrom(entity.getValidFrom())
                .validTo(entity.getValidTo())
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
