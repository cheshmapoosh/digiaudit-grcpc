package com.digiaudit.grcpc.modules.masterdata.accountgroup.application;

import static com.digiaudit.grcpc.common.util.Dates.parseNullable;
import static com.digiaudit.grcpc.common.util.Texts.*;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.api.dto.AccountGroupRequest;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.api.dto.AccountGroupResponse;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.api.mapper.AccountGroupMapper;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.entity.AccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.repository.AccountGroupRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AccountGroupService {
    private final AccountGroupRepository repository;
    private final AccountGroupMapper mapper;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<AccountGroupResponse> findAll() {
        return repository.findAllByOrderBySortOrderAscTitleAsc().stream().map(mapper::toResponse).toList();
    }

    public List<AccountGroupResponse> findRoots() {
        return repository.findByParentIdIsNullOrderBySortOrderAscTitleAsc().stream().map(mapper::toResponse).toList();
    }

    public List<AccountGroupResponse> findChildren(UUID parentId) {
        ensureExists(parentId);
        return repository.findByParentIdOrderBySortOrderAscTitleAsc(parentId).stream().map(mapper::toResponse).toList();
    }

    public AccountGroupResponse findById(UUID id) {
        return mapper.toResponse(get(id));
    }

    @Transactional
    public AccountGroupResponse create(AccountGroupRequest request, HttpServletRequest httpRequest) {
        validateCode(request.code(), null);
        validateParent(request.parentId());
        AccountGroupEntity saved = repository.save(fill(AccountGroupEntity.builder().build(), request));
        audit("ACCOUNT_GROUP_CREATED", saved.getId(), httpRequest, Map.of("code", saved.getCode()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public AccountGroupResponse update(UUID id, AccountGroupRequest request, HttpServletRequest httpRequest) {
        AccountGroupEntity entity = get(id);
        validateCode(request.code(), id);
        if (id.equals(request.parentId())) {
            throw invalidParent(request.parentId());
        }
        validateParent(request.parentId());
        AccountGroupEntity saved = repository.save(fill(entity, request));
        audit("ACCOUNT_GROUP_UPDATED", saved.getId(), httpRequest, Map.of("code", saved.getCode()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public AccountGroupResponse toggleStatus(UUID id, HttpServletRequest httpRequest) {
        AccountGroupEntity entity = get(id);
        entity.setStatus(toggleActiveInactive(entity.getStatus()));
        AccountGroupEntity saved = repository.save(entity);
        audit("ACCOUNT_GROUP_UPDATED", id, httpRequest, Map.of("status", saved.getStatus()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public void delete(UUID id, HttpServletRequest httpRequest) {
        AccountGroupEntity entity = get(id);
        if (repository.existsByParentId(id)) {
            throw new ConflictException("MASTER_DATA_HAS_CHILDREN", "error.masterdata.hasChildren", "Account group has children: " + id);
        }
        repository.delete(entity);
        audit("ACCOUNT_GROUP_DELETED", id, httpRequest, Map.of("code", entity.getCode()));
    }

    private AccountGroupEntity fill(AccountGroupEntity entity, AccountGroupRequest request) {
        entity.setCode(normalizeRequired(request.code()));
        entity.setTitle(normalizeRequired(request.title()));
        entity.setParentId(request.parentId());
        entity.setStatus(normalizeNullable(request.status()) == null ? "active" : normalizeNullable(request.status()));
        entity.setSortOrder(request.sortOrder());
        entity.setDescription(normalizeNullable(request.description()));
        entity.setImportance(normalizeNullable(request.importance()));
        entity.setReasonableAssurance(request.reasonableAssurance());
        entity.setEffectiveDate(parseNullable(request.effectiveDate()));
        entity.setDocumentsCount(request.documentsCount() == null ? 0 : request.documentsCount());
        entity.setAssertions(request.assertions());
        entity.setObjectives(request.objectives() == null ? List.of() : request.objectives());
        entity.setAccountRanges(request.accountRanges() == null ? List.of() : request.accountRanges());
        entity.setRisks(request.risks() == null ? List.of() : request.risks());
        return entity;
    }

    private void validateParent(UUID parentId) {
        if (parentId != null && !repository.existsById(parentId)) {
            throw invalidParent(parentId);
        }
    }

    private void validateCode(String code, UUID currentId) {
        String normalized = normalizeRequired(code);
        boolean exists = currentId == null ? repository.existsByCodeIgnoreCase(normalized) : repository.existsByCodeIgnoreCaseAndIdNot(normalized, currentId);
        if (exists) {
            throw new ConflictException("MASTER_DATA_DUPLICATE_CODE", "error.masterdata.duplicateCode", "Duplicate account group code: " + normalized, normalized);
        }
    }

    private AccountGroupEntity get(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Account group not found: " + id, id));
    }

    private void ensureExists(UUID id) {
        if (!repository.existsById(id)) {
            throw new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Account group not found: " + id, id);
        }
    }

    private ConflictException invalidParent(UUID parentId) {
        return new ConflictException("MASTER_DATA_INVALID_PARENT", "error.masterdata.invalidParent", "Invalid account group parent: " + parentId, parentId);
    }

    private void audit(String eventName, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        Map<String, Object> safeDetails = new LinkedHashMap<>();
        safeDetails.put("event", eventName);
        safeDetails.putAll(details);
        auditService.log(AuditEventType.MASTER_DATA_CHANGED, AuditTargetType.ACCOUNT_GROUP, targetId.toString(), ActionResult.SUCCESS, currentUserProvider.getCurrentUserIdOrNull(), request, safeDetails);
    }
}
