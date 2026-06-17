package com.digiaudit.grcpc.modules.masterdata.objective.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.masterdata.objective.api.dto.ObjectiveOrganizationAssignmentRequest;
import com.digiaudit.grcpc.modules.masterdata.objective.api.dto.ObjectiveOrganizationAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.entity.ObjectiveNodeEntity;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.entity.ObjectiveOrganizationAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.repository.ObjectiveNodeRepository;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.repository.ObjectiveOrganizationAssignmentRepository;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ObjectiveOrganizationAssignmentService {

    private final ObjectiveOrganizationAssignmentRepository repository;
    private final ObjectiveNodeRepository objectiveNodeRepository;
    private final OrganizationRepository organizationRepository;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public List<ObjectiveOrganizationAssignmentResponse> listByOrganization(
            UUID organizationId
    ) {
        ensureOrganization(organizationId);

        List<ObjectiveOrganizationAssignmentEntity> assignments =
                repository.findByOrganizationIdAndActiveTrueOrderByCreatedAtAsc(organizationId);
        if (assignments.isEmpty()) {
            return List.of();
        }

        Map<UUID, ObjectiveNodeEntity> objectivesById = objectiveNodeRepository.findAllById(
                        assignments.stream()
                                .map(ObjectiveOrganizationAssignmentEntity::getObjectiveNodeId)
                                .distinct()
                                .toList()
                )
                .stream()
                .collect(Collectors.toMap(ObjectiveNodeEntity::getId, Function.identity()));

        return assignments.stream()
                .filter(assignment -> objectivesById.containsKey(assignment.getObjectiveNodeId()))
                .sorted((left, right) -> compareObjectives(
                        objectivesById.get(left.getObjectiveNodeId()),
                        objectivesById.get(right.getObjectiveNodeId())
                ))
                .map(assignment -> toResponse(
                        assignment,
                        objectivesById.get(assignment.getObjectiveNodeId())
                ))
                .toList();
    }

    @Transactional
    public ObjectiveOrganizationAssignmentResponse assign(
            ObjectiveOrganizationAssignmentRequest request,
            HttpServletRequest httpRequest
    ) {
        ensureOrganization(request.organizationId());
        ObjectiveNodeEntity objective = ensureObjective(request.objectiveNodeId());

        Optional<ObjectiveOrganizationAssignmentEntity> existing = repository
                .findByObjectiveNodeIdAndOrganizationId(
                        request.objectiveNodeId(),
                        request.organizationId()
                );
        if (existing.isPresent() && existing.get().isActive()) {
            return toResponse(existing.get(), objective);
        }

        ObjectiveOrganizationAssignmentEntity entity = existing
                .orElseGet(() -> ObjectiveOrganizationAssignmentEntity.builder()
                        .objectiveNodeId(request.objectiveNodeId())
                        .organizationId(request.organizationId())
                        .build());
        entity.setActive(true);

        ObjectiveOrganizationAssignmentEntity saved = repository.save(entity);
        audit("OBJECTIVE_ORGANIZATION_ASSIGNED", saved.getId(), httpRequest, Map.of(
                "organizationId", saved.getOrganizationId(),
                "objectiveNodeId", saved.getObjectiveNodeId()
        ));

        return toResponse(saved, objective);
    }

    @Transactional
    public void remove(UUID assignmentId, HttpServletRequest httpRequest) {
        ObjectiveOrganizationAssignmentEntity entity = repository.findById(assignmentId)
                .orElseThrow(() -> new NotFoundException(
                        "MASTER_DATA_NOT_FOUND",
                        "error.masterdata.notFound",
                        "Objective organization assignment not found: " + assignmentId,
                        assignmentId
                ));

        if (!entity.isActive()) {
            return;
        }

        entity.setActive(false);
        repository.save(entity);
        audit("OBJECTIVE_ORGANIZATION_ASSIGNMENT_DEACTIVATED", assignmentId, httpRequest, Map.of(
                "organizationId", entity.getOrganizationId(),
                "objectiveNodeId", entity.getObjectiveNodeId()
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

    private ObjectiveNodeEntity ensureObjective(UUID id) {
        return objectiveNodeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(
                        "MASTER_DATA_NOT_FOUND",
                        "error.masterdata.notFound",
                        "Objective node not found: " + id,
                        id
                ));
    }

    private ObjectiveOrganizationAssignmentResponse toResponse(
            ObjectiveOrganizationAssignmentEntity assignment,
            ObjectiveNodeEntity objective
    ) {
        return ObjectiveOrganizationAssignmentResponse.builder()
                .assignmentId(assignment.getId())
                .objectiveNodeId(objective.getId())
                .organizationId(assignment.getOrganizationId())
                .objectiveCode(objective.getCode())
                .objectiveTitle(objective.getTitle())
                .objectiveStatus(objective.getStatus())
                .objectiveType(objective.getObjectiveType())
                .description(objective.getDescription())
                .effectiveFrom(objective.getEffectiveFrom())
                .validUntil(objective.getValidUntil())
                .active(assignment.isActive())
                .build();
    }

    private int compareObjectives(
            ObjectiveNodeEntity left,
            ObjectiveNodeEntity right
    ) {
        Comparator<ObjectiveNodeEntity> comparator = Comparator
                .comparing(ObjectiveNodeEntity::getSortOrder, Comparator.nullsLast(Integer::compareTo))
                .thenComparing(ObjectiveNodeEntity::getCode, Comparator.nullsLast(String::compareToIgnoreCase))
                .thenComparing(ObjectiveNodeEntity::getTitle, Comparator.nullsLast(String::compareToIgnoreCase));

        return comparator.compare(left, right);
    }

    private void audit(String eventName, UUID targetId, HttpServletRequest request, Map<String, Object> details) {
        Map<String, Object> safeDetails = new LinkedHashMap<>();
        safeDetails.put("event", eventName);
        safeDetails.putAll(details);
        auditService.log(
                AuditEventType.MASTER_DATA_CHANGED,
                AuditTargetType.OBJECTIVE_ORGANIZATION_ASSIGNMENT,
                targetId.toString(),
                ActionResult.SUCCESS,
                currentUserProvider.getCurrentUserIdOrNull(),
                request,
                safeDetails
        );
    }
}
