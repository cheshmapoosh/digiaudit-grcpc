package com.digiaudit.grcpc.modules.masterdata.process.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessRegulationAssignmentRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessRegulationAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.process.api.mapper.ProcessRegulationAssignmentMapper;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessRegulationAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessNodeRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.ProcessRegulationAssignmentRepository;
import com.digiaudit.grcpc.modules.regulation.domain.entity.RegulationEntity;
import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationNodeType;
import com.digiaudit.grcpc.modules.regulation.domain.repository.RegulationRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
public class ProcessRegulationAssignmentService {

    private final ProcessRegulationAssignmentRepository repository;
    private final ProcessNodeRepository processNodeRepository;
    private final RegulationRepository regulationRepository;
    private final ProcessRegulationAssignmentMapper mapper;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<ProcessRegulationAssignmentResponse> listByProcess(UUID processNodeId) {
        ensureProcessNode(processNodeId);
        List<ProcessRegulationAssignmentEntity> assignments = repository.findByProcessNodeIdOrderByCreatedAtAsc(processNodeId);
        Map<UUID, RegulationEntity> regulationsById = regulationRepository.findAllById(
                        assignments.stream().map(ProcessRegulationAssignmentEntity::getRegulationNodeId).toList()
                )
                .stream()
                .collect(Collectors.toMap(RegulationEntity::getId, Function.identity()));

        List<ProcessRegulationAssignmentResponse> result = assignments.stream()
                .map(assignment -> mapper.toResponse(assignment, requireRegulation(regulationsById, assignment.getRegulationNodeId())))
                .toList();
        log.debug("Listed process regulation assignments. processNodeId={}, count={}", processNodeId, result.size());
        return result;
    }

    @Transactional
    public ProcessRegulationAssignmentResponse add(ProcessRegulationAssignmentRequest request, HttpServletRequest httpRequest) {
        ensureProcessNode(request.processNodeId());
        RegulationEntity regulation = ensureLaw(request.regulationNodeId());

        repository.findByProcessNodeIdAndRegulationNodeId(request.processNodeId(), request.regulationNodeId())
                .filter(ProcessRegulationAssignmentEntity::isActive)
                .ifPresent(existing -> {
                    throw new ConflictException(
                            "MASTER_DATA_DUPLICATE_ASSIGNMENT",
                            "error.masterdata.duplicateAssignment",
                            "Process regulation assignment already exists: " + existing.getId(),
                            existing.getId()
                    );
                });

        ProcessRegulationAssignmentEntity entity = repository.findByProcessNodeIdAndRegulationNodeId(request.processNodeId(), request.regulationNodeId())
                .orElseGet(() -> ProcessRegulationAssignmentEntity.builder()
                        .processNodeId(request.processNodeId())
                        .regulationNodeId(request.regulationNodeId())
                        .build());
        entity.setActive(request.isActive() == null || request.isActive());

        ProcessRegulationAssignmentEntity saved = repository.save(entity);
        log.debug(
                "Saved process regulation assignment. assignmentId={}, processNodeId={}, regulationNodeId={}",
                saved.getId(),
                saved.getProcessNodeId(),
                saved.getRegulationNodeId()
        );
        audit("PROCESS_REGULATION_ADDED", saved.getId(), httpRequest, Map.of(
                "processNodeId", saved.getProcessNodeId(),
                "regulationNodeId", saved.getRegulationNodeId(),
                "isActive", saved.isActive()
        ));
        return mapper.toResponse(saved, regulation);
    }

    @Transactional
    public void remove(UUID id, HttpServletRequest httpRequest) {
        ProcessRegulationAssignmentEntity entity = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Process regulation assignment not found: " + id, id));
        log.debug(
                "Deleting process regulation assignment. assignmentId={}, processNodeId={}, regulationNodeId={}",
                entity.getId(),
                entity.getProcessNodeId(),
                entity.getRegulationNodeId()
        );
        repository.delete(entity);
        audit("PROCESS_REGULATION_DELETED", id, httpRequest, Map.of(
                "processNodeId", entity.getProcessNodeId(),
                "regulationNodeId", entity.getRegulationNodeId(),
                "isActive", entity.isActive()
        ));
    }

    private void ensureProcessNode(UUID id) {
        if (!processNodeRepository.existsById(id)) {
            throw new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Process node not found: " + id, id);
        }
    }

    private RegulationEntity ensureLaw(UUID id) {
        RegulationEntity regulation = regulationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Regulation node not found: " + id, id));

        if (regulation.getNodeType() != RegulationNodeType.LAW) {
            throw new ConflictException(
                    "MASTER_DATA_INVALID_REFERENCE",
                    "error.masterdata.invalidParent",
                    "Process regulations must reference law nodes: " + id,
                    id
            );
        }

        return regulation;
    }

    private RegulationEntity requireRegulation(Map<UUID, RegulationEntity> regulationsById, UUID regulationNodeId) {
        RegulationEntity regulation = regulationsById.get(regulationNodeId);
        if (regulation == null) {
            throw new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.notFound", "Regulation node not found: " + regulationNodeId, regulationNodeId);
        }

        return regulation;
    }

    private void audit(String eventName, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        Map<String, Object> safeDetails = new LinkedHashMap<>();
        safeDetails.put("event", eventName);
        safeDetails.putAll(details);
        auditService.log(AuditEventType.MASTER_DATA_CHANGED, AuditTargetType.PROCESS_REGULATION_ASSIGNMENT, targetId.toString(), ActionResult.SUCCESS, currentUserProvider.getCurrentUserIdOrNull(), request, safeDetails);
    }
}
