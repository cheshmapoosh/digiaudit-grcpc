package com.digiaudit.grcpc.modules.organization.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionActorProvider;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionCoordinator;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionResult;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionOperationResult;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionRequest;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataStructuralDependencyChecker;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;
import com.digiaudit.grcpc.modules.organization.api.dto.CreateOrganizationRequest;
import com.digiaudit.grcpc.modules.organization.api.dto.MoveOrganizationRequest;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationResponse;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationTreeNodeResponse;
import com.digiaudit.grcpc.modules.organization.api.dto.UpdateOrganizationRequest;
import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationEntity;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class OrganizationService {
    private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;
    private static final Comparator<OrganizationEntity> ORGANIZATION_ORDER = Comparator
            .comparing(OrganizationEntity::getCode, String.CASE_INSENSITIVE_ORDER)
            .thenComparing(OrganizationEntity::getId);

    private final OrganizationRepository organizationRepository;
    private final MasterDataRevisionCoordinator revisionCoordinator;
    private final MasterDataRevisionActorProvider actorProvider;
    private final Clock clock;
    private final ObjectMapper objectMapper;
    private final MasterDataStructuralDependencyChecker dependencyChecker;

    public OrganizationService(
            OrganizationRepository organizationRepository,
            MasterDataRevisionCoordinator revisionCoordinator,
            MasterDataRevisionActorProvider actorProvider,
            @Qualifier("masterDataRevisionClock") Clock clock,
            ObjectMapper objectMapper,
            MasterDataStructuralDependencyChecker dependencyChecker
    ) {
        this.organizationRepository = Objects.requireNonNull(organizationRepository, "organizationRepository is required");
        this.revisionCoordinator = Objects.requireNonNull(revisionCoordinator, "revisionCoordinator is required");
        this.actorProvider = Objects.requireNonNull(actorProvider, "actorProvider is required");
        this.clock = Objects.requireNonNull(clock, "clock is required");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper is required");
        this.dependencyChecker = Objects.requireNonNull(dependencyChecker, "dependencyChecker is required");
    }

    @Transactional(readOnly = true)
    public List<OrganizationResponse> findAll() {
        return organizationRepository.findByStatusNotOrderByCodeAscIdAsc(DELETED)
                .stream()
                .sorted(ORGANIZATION_ORDER)
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrganizationTreeNodeResponse> findTree() {
        return buildTree(organizationRepository.findByStatusNotOrderByCodeAscIdAsc(DELETED));
    }

    @Transactional(readOnly = true)
    public OrganizationResponse findById(UUID id) {
        return toResponse(findActiveReadable(id));
    }

    public MasterDataRevisionMutationResponse create(CreateOrganizationRequest request) {
        String code = normalizeCode(request.code(), "DUPLICATE_ORGANIZATION_CODE");
        validateValidity(request.validFrom(), request.validTo());
        try {
            RevisionExecutionResult result = revisionCoordinator.execute(
                    RevisionRequest.central("Create organization " + code, "Organization structural create", null),
                    context -> createInsideRevision(context, code, request)
            );
            return MasterDataRevisionMutationResponse.from(result.primaryResult());
        } catch (DataIntegrityViolationException ex) {
            throw duplicateCode(code);
        }
    }

    public MasterDataRevisionMutationResponse update(UUID organizationId, UpdateOrganizationRequest request) {
        long expectedVersion = requireVersion(request.version());
        validateValidity(request.validFrom(), request.validTo());
        RevisionExecutionResult result = revisionCoordinator.execute(
                RevisionRequest.central("Update organization " + organizationId, "Organization structural update", null),
                context -> updateInsideRevision(context, organizationId, expectedVersion, request.validFrom(), request.validTo())
        );
        return MasterDataRevisionMutationResponse.from(result.primaryResult());
    }

    public MasterDataRevisionMutationResponse move(UUID organizationId, MoveOrganizationRequest request) {
        long expectedVersion = requireVersion(request.version());
        RevisionExecutionResult result = revisionCoordinator.execute(
                RevisionRequest.central("Move organization " + organizationId, "Organization hierarchy move", null),
                context -> moveInsideRevision(context, organizationId, expectedVersion, request.parentOrganizationId())
        );
        return MasterDataRevisionMutationResponse.from(result.primaryResult());
    }

    public MasterDataRevisionMutationResponse activate(UUID organizationId, OrganizationLifecycleCommandRequest request) {
        return lifecycle(organizationId, request, RevisionOperationType.ACTIVATE);
    }

    public MasterDataRevisionMutationResponse inactivate(UUID organizationId, OrganizationLifecycleCommandRequest request) {
        return lifecycle(organizationId, request, RevisionOperationType.INACTIVATE);
    }

    public MasterDataRevisionMutationResponse delete(UUID organizationId, OrganizationLifecycleCommandRequest request) {
        return lifecycle(organizationId, request, RevisionOperationType.DELETE);
    }

    public MasterDataRevisionMutationResponse restore(UUID organizationId, OrganizationLifecycleCommandRequest request) {
        return lifecycle(organizationId, request, RevisionOperationType.RESTORE);
    }

    private RevisionOperationResult createInsideRevision(
            RevisionExecutionContext context,
            String code,
            CreateOrganizationRequest request
    ) {
        UUID actorId = actorProvider.currentActorId();
        Instant now = Instant.now(clock);
        OrganizationEntity entity = organizationRepository.lockByNormalizedCode(code).orElse(null);

        if (entity == null) {
            UUID entityId = UUID.randomUUID();
            lockAndValidateParent(entityId, request.parentOrganizationId());
            OrganizationEntity created = OrganizationEntity.create(
                    entityId,
                    code,
                    request.parentOrganizationId(),
                    request.validFrom(),
                    request.validTo(),
                    actorId,
                    now
            );
            OrganizationEntity saved = organizationRepository.saveAndFlush(created);
            return completed(context, saved, RevisionOperationType.CREATE, null, null);
        }

        JsonNode before = snapshot(entity);
        if (entity.getStatus() == MasterDataLifecycleStatus.ACTIVE) {
            throw duplicateCode(code);
        }

        lockAndValidateParent(entity.getId(), request.parentOrganizationId());
        RevisionOperationType operationType = entity.getStatus() == MasterDataLifecycleStatus.DELETED
                ? RevisionOperationType.RESTORE
                : RevisionOperationType.ACTIVATE;
        long expectedVersion = entity.getVersion();
        if (operationType == RevisionOperationType.RESTORE) {
            entity.restoreFromCreate(request.parentOrganizationId(), request.validFrom(), request.validTo(), actorId, now);
        } else {
            entity.reactivateFromCreate(request.parentOrganizationId(), request.validFrom(), request.validTo(), actorId, now);
        }

        OrganizationEntity saved = organizationRepository.saveAndFlush(entity);
        return completed(context, saved, operationType, expectedVersion, before);
    }

    private RevisionOperationResult updateInsideRevision(
            RevisionExecutionContext context,
            UUID organizationId,
            long expectedVersion,
            LocalDate validFrom,
            LocalDate validTo
    ) {
        OrganizationEntity entity = lockExisting(organizationId, "ORGANIZATION_NOT_FOUND");
        assertVersion(entity, expectedVersion);
        JsonNode before = snapshot(entity);
        entity.updateValidity(validFrom, validTo, actorProvider.currentActorId(), Instant.now(clock));
        OrganizationEntity saved = organizationRepository.saveAndFlush(entity);
        return completed(context, saved, RevisionOperationType.UPDATE, expectedVersion, before);
    }

    private RevisionOperationResult moveInsideRevision(
            RevisionExecutionContext context,
            UUID organizationId,
            long expectedVersion,
            UUID parentOrganizationId
    ) {
        OrganizationEntity entity = lockExisting(organizationId, "ORGANIZATION_NOT_FOUND");
        assertVersion(entity, expectedVersion);
        JsonNode before = snapshot(entity);
        lockAndValidateParent(organizationId, parentOrganizationId);
        entity.move(parentOrganizationId, actorProvider.currentActorId(), Instant.now(clock));
        OrganizationEntity saved = organizationRepository.saveAndFlush(entity);
        return completed(context, saved, RevisionOperationType.UPDATE, expectedVersion, before);
    }

    private MasterDataRevisionMutationResponse lifecycle(
            UUID organizationId,
            OrganizationLifecycleCommandRequest request,
            RevisionOperationType operationType
    ) {
        long expectedVersion = requireVersion(request.version());
        RevisionExecutionResult result = revisionCoordinator.execute(
                RevisionRequest.central(operationType.name() + " organization " + organizationId, "Organization lifecycle command", null),
                context -> lifecycleInsideRevision(context, organizationId, expectedVersion, operationType)
        );
        return MasterDataRevisionMutationResponse.from(result.primaryResult());
    }

    private RevisionOperationResult lifecycleInsideRevision(
            RevisionExecutionContext context,
            UUID organizationId,
            long expectedVersion,
            RevisionOperationType operationType
    ) {
        OrganizationEntity entity = lockExisting(organizationId, "ORGANIZATION_NOT_FOUND");
        assertVersion(entity, expectedVersion);
        if (operationType == RevisionOperationType.DELETE) {
            validateDeleteDependencies(entity.getId());
        }
        if (operationType == RevisionOperationType.RESTORE) {
            validateRestoreParent(entity);
            validateValidity(entity.getValidFrom(), entity.getValidTo());
        }

        JsonNode before = snapshot(entity);
        UUID actorId = actorProvider.currentActorId();
        Instant now = Instant.now(clock);
        switch (operationType) {
            case ACTIVATE -> entity.activate(actorId, now);
            case INACTIVATE -> entity.inactivate(actorId, now);
            case DELETE -> entity.delete(actorId, now);
            case RESTORE -> entity.restore(actorId, now);
            default -> throw new IllegalArgumentException("Unsupported organization lifecycle operation");
        }
        OrganizationEntity saved = organizationRepository.saveAndFlush(entity);
        return completed(context, saved, operationType, expectedVersion, before);
    }

    private RevisionOperationResult completed(
            RevisionExecutionContext context,
            OrganizationEntity entity,
            RevisionOperationType operationType,
            Long expectedVersion,
            JsonNode beforeSnapshot
    ) {
        MasterDataMutationResult primary = new MasterDataMutationResult(entity.getId(), context.revisionId(), entity.getVersion());
        return RevisionOperationResult.completed(
                context,
                primary,
                List.of(RevisionContentResult.completed(
                        RevisionEntityType.ORGANIZATION,
                        entity.getId(),
                        operationType,
                        expectedVersion,
                        beforeSnapshot,
                        snapshot(entity),
                        entity.getVersion(),
                        validationSnapshot()
                ))
        );
    }

    private void lockAndValidateParent(UUID organizationId, UUID parentOrganizationId) {
        List<OrganizationEntity> locked = organizationRepository.lockAllNonDeleted(DELETED);
        Map<UUID, OrganizationEntity> byId = indexById(locked);
        if (parentOrganizationId == null) {
            return;
        }
        if (organizationId.equals(parentOrganizationId)) {
            throw hierarchySelfParent();
        }
        OrganizationEntity parent = byId.get(parentOrganizationId);
        if (parent == null) {
            throw new NotFoundException("PARENT_ORGANIZATION_NOT_FOUND", "error.masterdata.v2.parentOrganizationNotFound", "Parent organization not found: " + parentOrganizationId, parentOrganizationId);
        }
        validateNoCycle(organizationId, parentOrganizationId, byId);
    }

    private void validateRestoreParent(OrganizationEntity entity) {
        UUID parentOrganizationId = entity.getParentOrganizationId();
        if (parentOrganizationId == null) {
            return;
        }
        if (!organizationRepository.existsByIdAndStatusNot(parentOrganizationId, DELETED)) {
            throw new NotFoundException("PARENT_ORGANIZATION_NOT_FOUND", "error.masterdata.v2.parentOrganizationNotFound", "Parent organization not found: " + parentOrganizationId, parentOrganizationId);
        }
    }

    private void validateNoCycle(UUID organizationId, UUID parentOrganizationId, Map<UUID, OrganizationEntity> byId) {
        Set<UUID> visited = new HashSet<>();
        UUID current = parentOrganizationId;
        while (current != null) {
            if (!visited.add(current)) {
                throw hierarchyCycle();
            }
            if (organizationId.equals(current)) {
                throw hierarchyCycle();
            }
            OrganizationEntity parent = byId.get(current);
            if (parent == null) {
                throw new NotFoundException("PARENT_ORGANIZATION_NOT_FOUND", "error.masterdata.v2.parentOrganizationNotFound", "Parent organization not found: " + current, current);
            }
            current = parent.getParentOrganizationId();
        }
    }

    private void validateDeleteDependencies(UUID organizationId) {
        if (organizationRepository.existsByParentOrganizationIdAndStatusNot(organizationId, DELETED)) {
            throw new ConflictException("DEPENDENT_CHILDREN_EXIST", "error.masterdata.v2.dependentChildrenExist", "Organization has child organizations: " + organizationId, organizationId);
        }
        if (dependencyChecker.organizationHasApprovedDependencies(organizationId)) {
            throw new ConflictException("DEPENDENT_MASTER_DATA_EXISTS", "error.masterdata.v2.dependentMasterDataExists", "Organization has dependent Master Data references: " + organizationId, organizationId);
        }
    }

    private OrganizationEntity lockExisting(UUID organizationId, String errorCode) {
        OrganizationEntity entity = organizationRepository.lockById(organizationId)
                .orElseThrow(() -> new NotFoundException(errorCode, "error.masterdata.v2.organizationNotFound", "Organization not found: " + organizationId, organizationId));
        if (entity.getStatus() == DELETED && !"ORGANIZATION_NOT_FOUND".equals(errorCode)) {
            throw new NotFoundException(errorCode, "error.masterdata.v2.organizationNotFound", "Organization not found: " + organizationId, organizationId);
        }
        return entity;
    }

    private OrganizationEntity findActiveReadable(UUID id) {
        return organizationRepository.findByIdAndStatusNot(id, DELETED)
                .orElseThrow(() -> new NotFoundException("ORGANIZATION_NOT_FOUND", "error.masterdata.v2.organizationNotFound", "Organization not found: " + id, id));
    }

    private void assertVersion(OrganizationEntity entity, long expectedVersion) {
        if (entity.getVersion() != expectedVersion) {
            throw new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict", "Organization version conflict: " + entity.getId(), entity.getId());
        }
    }

    private long requireVersion(Long version) {
        if (version == null || version < 0) {
            throw new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict", "Expected version is required", version);
        }
        return version;
    }

    private String normalizeCode(String code, String duplicateCode) {
        if (code == null || code.isBlank()) {
            throw new UnprocessableEntityException(duplicateCode, "error.masterdata.v2.codeRequired", "Organization code is required");
        }
        String normalized = code.trim().toUpperCase(Locale.ROOT);
        if (normalized.getBytes(StandardCharsets.UTF_8).length > 64) {
            throw new UnprocessableEntityException("INVALID_CODE_LENGTH", "error.masterdata.v2.codeLength", "Organization code exceeds 64 bytes", normalized);
        }
        return normalized;
    }

    private void validateValidity(LocalDate validFrom, LocalDate validTo) {
        if (validFrom != null && validTo != null && validTo.isBefore(validFrom)) {
            throw new UnprocessableEntityException("INVALID_VALIDITY_RANGE", "error.masterdata.v2.invalidValidityRange", "Organization validity range is invalid");
        }
    }

    private ConflictException duplicateCode(String code) {
        return new ConflictException("DUPLICATE_ORGANIZATION_CODE", "error.masterdata.v2.duplicateOrganizationCode", "Duplicate organization code: " + code, code);
    }

    private UnprocessableEntityException hierarchySelfParent() {
        return new UnprocessableEntityException("HIERARCHY_SELF_PARENT", "error.masterdata.v2.hierarchySelfParent", "Organization cannot parent itself");
    }

    private UnprocessableEntityException hierarchyCycle() {
        return new UnprocessableEntityException("HIERARCHY_CYCLE", "error.masterdata.v2.hierarchyCycle", "Organization hierarchy cycle detected");
    }

    private Map<UUID, OrganizationEntity> indexById(List<OrganizationEntity> organizations) {
        Map<UUID, OrganizationEntity> byId = new HashMap<>();
        for (OrganizationEntity organization : organizations) {
            byId.put(organization.getId(), organization);
        }
        return byId;
    }

    private List<OrganizationTreeNodeResponse> buildTree(List<OrganizationEntity> entities) {
        Map<UUID, MutableOrganizationTreeNode> nodes = new HashMap<>();
        for (OrganizationEntity entity : entities) {
            nodes.put(entity.getId(), new MutableOrganizationTreeNode(entity));
        }
        List<MutableOrganizationTreeNode> roots = new ArrayList<>();
        for (OrganizationEntity entity : entities) {
            MutableOrganizationTreeNode node = nodes.get(entity.getId());
            UUID parentId = entity.getParentOrganizationId();
            if (parentId == null) {
                roots.add(node);
                continue;
            }
            MutableOrganizationTreeNode parent = nodes.get(parentId);
            if (parent == null) {
                throw new UnprocessableEntityException("HIERARCHY_DEPTH_INVALID", "error.masterdata.v2.hierarchyDepthInvalid", "Organization hierarchy has a missing non-deleted parent: " + parentId, parentId);
            }
            parent.children.add(node);
        }
        detectTreeCycles(nodes);
        roots.sort(MutableOrganizationTreeNode.ORDER);
        return roots.stream().map(this::toTreeResponse).toList();
    }

    private void detectTreeCycles(Map<UUID, MutableOrganizationTreeNode> nodes) {
        Set<UUID> visited = new HashSet<>();
        Set<UUID> visiting = new HashSet<>();
        for (UUID id : nodes.keySet()) {
            detectTreeCycles(id, nodes, visited, visiting);
        }
    }

    private void detectTreeCycles(
            UUID id,
            Map<UUID, MutableOrganizationTreeNode> nodes,
            Set<UUID> visited,
            Set<UUID> visiting
    ) {
        if (visited.contains(id)) {
            return;
        }
        if (!visiting.add(id)) {
            throw hierarchyCycle();
        }
        OrganizationEntity entity = nodes.get(id).entity;
        UUID parentId = entity.getParentOrganizationId();
        if (parentId != null && nodes.containsKey(parentId)) {
            detectTreeCycles(parentId, nodes, visited, visiting);
        }
        visiting.remove(id);
        visited.add(id);
    }

    private OrganizationTreeNodeResponse toTreeResponse(MutableOrganizationTreeNode node) {
        node.children.sort(MutableOrganizationTreeNode.ORDER);
        return new OrganizationTreeNodeResponse(
                node.entity.getId(),
                node.entity.getCode(),
                node.entity.getParentOrganizationId(),
                node.entity.getCode(),
                node.entity.getStatus(),
                node.entity.getValidFrom(),
                node.entity.getValidTo(),
                node.entity.getVersion(),
                node.children.stream().map(this::toTreeResponse).toList()
        );
    }

    private OrganizationResponse toResponse(OrganizationEntity entity) {
        return new OrganizationResponse(
                entity.getId(),
                entity.getCode(),
                entity.getParentOrganizationId(),
                entity.getCode(),
                entity.getStatus(),
                entity.getValidFrom(),
                entity.getValidTo(),
                entity.getVersion(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedBy(),
                entity.getUpdatedBy(),
                entity.getDeletedAt(),
                entity.getDeletedBy()
        );
    }

    private JsonNode snapshot(OrganizationEntity entity) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("id", entity.getId());
        snapshot.put("code", entity.getCode());
        snapshot.put("parentOrganizationId", entity.getParentOrganizationId());
        snapshot.put("displayLabel", entity.getCode());
        snapshot.put("status", entity.getStatus().wireValue());
        snapshot.put("validFrom", entity.getValidFrom());
        snapshot.put("validTo", entity.getValidTo());
        snapshot.put("version", entity.getVersion());
        snapshot.put("createdAt", entity.getCreatedAt());
        snapshot.put("updatedAt", entity.getUpdatedAt());
        snapshot.put("createdBy", entity.getCreatedBy());
        snapshot.put("updatedBy", entity.getUpdatedBy());
        snapshot.put("deletedAt", entity.getDeletedAt());
        snapshot.put("deletedBy", entity.getDeletedBy());
        return objectMapper.valueToTree(snapshot);
    }

    private JsonNode validationSnapshot() {
        return objectMapper.valueToTree(Map.of("validated", true));
    }

    private static final class MutableOrganizationTreeNode {
        private static final Comparator<MutableOrganizationTreeNode> ORDER = Comparator
                .comparing((MutableOrganizationTreeNode node) -> node.entity.getCode(), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(node -> node.entity.getId());

        private final OrganizationEntity entity;
        private final List<MutableOrganizationTreeNode> children = new ArrayList<>();

        private MutableOrganizationTreeNode(OrganizationEntity entity) {
            this.entity = entity;
        }
    }
}
