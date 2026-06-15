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
import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.entity.AccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.repository.AccountGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessAccountGroupAssignmentRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessAccountGroupAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.process.api.mapper.ProcessAccountGroupAssignmentMapper;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessAccountGroupAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessAccountGroupAssignmentRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessNodeRepository;
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
public class ProcessAccountGroupAssignmentService {

    private static final Set<String> SUPPORTED_ASSIGNMENT_TYPES = Set.of("scope", "owner", "participant");

    private final ProcessAccountGroupAssignmentRepository repository;
    private final ProcessNodeRepository processNodeRepository;
    private final AccountGroupRepository accountGroupRepository;
    private final ProcessAccountGroupAssignmentMapper mapper;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<ProcessAccountGroupAssignmentResponse> listByProcess(UUID processNodeId) {
        ensureProcessNode(processNodeId);
        List<ProcessAccountGroupAssignmentEntity> assignments = repository.findByProcessNodeIdOrderByCreatedAtAsc(processNodeId);
        Map<UUID, AccountGroupEntity> accountGroupsById = accountGroupRepository.findAllById(
                        assignments.stream().map(ProcessAccountGroupAssignmentEntity::getAccountGroupId).toList()
                )
                .stream()
                .collect(Collectors.toMap(AccountGroupEntity::getId, Function.identity()));

        List<ProcessAccountGroupAssignmentResponse> result = assignments.stream()
                .map(assignment -> mapper.toResponse(assignment, requireAccountGroup(accountGroupsById, assignment.getAccountGroupId())))
                .toList();
        log.debug(
                "Listed process account group assignments. processNodeId={}, count={}",
                processNodeId,
                result.size()
        );
        return result;
    }

    @Transactional
    public ProcessAccountGroupAssignmentResponse assign(ProcessAccountGroupAssignmentRequest request, HttpServletRequest httpRequest) {
        ensureProcessNode(request.processNodeId());
        AccountGroupEntity accountGroup = ensureAccountGroup(request.accountGroupId());
        LocalDate validFrom = parseNullable(request.validFrom());
        LocalDate validTo = parseNullable(request.validTo());
        requireValidRange(validFrom, validTo, "Assignment validTo cannot be before validFrom");

        ProcessAccountGroupAssignmentEntity entity = repository.findByProcessNodeIdAndAccountGroupId(request.processNodeId(), request.accountGroupId())
                .orElseGet(() -> ProcessAccountGroupAssignmentEntity.builder()
                        .processNodeId(request.processNodeId())
                        .accountGroupId(request.accountGroupId())
                        .build());
        entity.setAssignmentType(normalizeAssignmentType(request.assignmentType()));
        entity.setValidFrom(validFrom);
        entity.setValidTo(validTo);
        entity.setActive(request.isActive() == null || request.isActive());

        ProcessAccountGroupAssignmentEntity saved = repository.save(entity);
        log.debug(
                "Saved process account group assignment. assignmentId={}, processNodeId={}, accountGroupId={}",
                saved.getId(),
                saved.getProcessNodeId(),
                saved.getAccountGroupId()
        );
        audit("PROCESS_ACCOUNT_GROUP_ASSIGNED", saved.getId(), httpRequest, Map.of(
                "processNodeId", saved.getProcessNodeId(),
                "accountGroupId", saved.getAccountGroupId(),
                "assignmentType", saved.getAssignmentType(),
                "isActive", saved.isActive()
        ));
        return mapper.toResponse(saved, accountGroup);
    }

    @Transactional
    public void remove(UUID id, HttpServletRequest httpRequest) {
        ProcessAccountGroupAssignmentEntity entity = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Process account group assignment not found: " + id, id));
        log.debug(
                "Deleting process account group assignment. assignmentId={}, processNodeId={}, accountGroupId={}",
                entity.getId(),
                entity.getProcessNodeId(),
                entity.getAccountGroupId()
        );
        repository.delete(entity);
        audit("PROCESS_ACCOUNT_GROUP_ASSIGNMENT_DELETED", id, httpRequest, Map.of(
                "processNodeId", entity.getProcessNodeId(),
                "accountGroupId", entity.getAccountGroupId(),
                "assignmentType", entity.getAssignmentType(),
                "isActive", entity.isActive()
        ));
    }

    private void ensureProcessNode(UUID id) {
        if (!processNodeRepository.existsById(id)) {
            throw new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Process node not found: " + id, id);
        }
    }

    private AccountGroupEntity ensureAccountGroup(UUID id) {
        return accountGroupRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Account group not found: " + id, id));
    }

    private AccountGroupEntity requireAccountGroup(Map<UUID, AccountGroupEntity> accountGroupsById, UUID accountGroupId) {
        AccountGroupEntity accountGroup = accountGroupsById.get(accountGroupId);
        if (accountGroup == null) {
            throw new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Account group not found: " + accountGroupId, accountGroupId);
        }

        return accountGroup;
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
                    "Invalid process account group assignment type: " + assignmentType,
                    assignmentType
            );
        }

        return normalized;
    }

    private void audit(String eventName, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        Map<String, Object> safeDetails = new LinkedHashMap<>();
        safeDetails.put("event", eventName);
        safeDetails.putAll(details);
        auditService.log(AuditEventType.MASTER_DATA_CHANGED, AuditTargetType.PROCESS_ACCOUNT_GROUP_ASSIGNMENT, targetId.toString(), ActionResult.SUCCESS, currentUserProvider.getCurrentUserIdOrNull(), request, safeDetails);
    }
}
