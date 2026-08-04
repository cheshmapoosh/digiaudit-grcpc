package com.digiaudit.grcpc.modules.masterdata.process.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CentralProcessLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CentralProcessResponse;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CentralSubprocessLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CentralSubprocessResponse;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CreateCentralProcessRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CreateCentralSubprocessRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.MoveCentralProcessRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.MoveCentralSubprocessRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessTreeNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessTreeNodeType;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.UpdateCentralProcessRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.UpdateCentralSubprocessRequest;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralProcessEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralProcessRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionActorProvider;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionCoordinator;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionResult;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionMutationGuard;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionOperationResult;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionRequest;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionOperationType;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.application.MasterDataStructuralDependencyChecker;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataMutationResult;
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
public class ProcessService {
    private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;

    private static final Comparator<CentralProcessEntity> PROCESS_ORDER = Comparator
            .comparingInt(CentralProcessEntity::getSortOrder)
            .thenComparing(CentralProcessEntity::getTitle, String.CASE_INSENSITIVE_ORDER)
            .thenComparing(CentralProcessEntity::getId);

    private static final Comparator<CentralSubprocessEntity> SUBPROCESS_ORDER = Comparator
            .comparingInt(CentralSubprocessEntity::getSortOrder)
            .thenComparing(CentralSubprocessEntity::getTitle, String.CASE_INSENSITIVE_ORDER)
            .thenComparing(CentralSubprocessEntity::getId);

    private final CentralProcessRepository processRepository;
    private final CentralSubprocessRepository subprocessRepository;
    private final MasterDataRevisionCoordinator revisionCoordinator;
    private final MasterDataRevisionActorProvider actorProvider;
    private final Clock clock;
    private final ObjectMapper objectMapper;
    private final MasterDataStructuralDependencyChecker dependencyChecker;
    private final RevisionMutationGuard mutationGuard;

    public ProcessService(
            CentralProcessRepository processRepository,
            CentralSubprocessRepository subprocessRepository,
            MasterDataRevisionCoordinator revisionCoordinator,
            MasterDataRevisionActorProvider actorProvider,
            @Qualifier("masterDataRevisionClock") Clock clock,
            ObjectMapper objectMapper,
            MasterDataStructuralDependencyChecker dependencyChecker,
            RevisionMutationGuard mutationGuard
    ) {
        this.processRepository = Objects.requireNonNull(processRepository, "processRepository is required");
        this.subprocessRepository = Objects.requireNonNull(subprocessRepository, "subprocessRepository is required");
        this.revisionCoordinator = Objects.requireNonNull(revisionCoordinator, "revisionCoordinator is required");
        this.actorProvider = Objects.requireNonNull(actorProvider, "actorProvider is required");
        this.clock = Objects.requireNonNull(clock, "clock is required");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper is required");
        this.dependencyChecker = Objects.requireNonNull(dependencyChecker, "dependencyChecker is required");
        this.mutationGuard = Objects.requireNonNull(mutationGuard, "mutationGuard is required");
    }

    @Transactional(readOnly = true)
    public List<CentralProcessResponse> listProcesses(String lifecycleStatus) {
        MasterDataLifecycleStatus requestedStatus = parseLifecycleFilter(lifecycleStatus);
        List<CentralProcessEntity> processes = requestedStatus == null
                ? processRepository.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(DELETED)
                : processRepository.findByStatusOrderBySortOrderAscTitleAscIdAsc(requestedStatus);
        return processes
                .stream()
                .sorted(PROCESS_ORDER)
                .map(this::toProcessResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CentralProcessResponse getProcess(UUID processId) {
        return toProcessResponse(findReadableProcess(processId));
    }

    @Transactional(readOnly = true)
    public List<CentralSubprocessResponse> listSubprocesses(String lifecycleStatus) {
        MasterDataLifecycleStatus requestedStatus = parseLifecycleFilter(lifecycleStatus);
        List<CentralSubprocessEntity> subprocesses = requestedStatus == null
                ? subprocessRepository.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(DELETED)
                : subprocessRepository.findByStatusOrderBySortOrderAscTitleAscIdAsc(requestedStatus);
        return subprocesses
                .stream()
                .sorted(SUBPROCESS_ORDER)
                .map(this::toSubprocessResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CentralSubprocessResponse getSubprocess(UUID subprocessId) {
        return toSubprocessResponse(findReadableSubprocess(subprocessId));
    }

    @Transactional(readOnly = true)
    public List<ProcessTreeNodeResponse> findProcessTree() {
        return buildTree(
                processRepository.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(DELETED),
                subprocessRepository.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(DELETED)
        );
    }

    public MasterDataRevisionMutationResponse createProcess(CreateCentralProcessRequest request) {
        String code = normalizeCode(request.code(), "DUPLICATE_PROCESS_CODE");
        String title = normalizeTitle(request.title());
        String description = normalizeDescription(request.description());
        int sortOrder = normalizeSortOrder(request.sortOrder());
        validateValidity(request.validFrom(), request.validTo());
        try {
            RevisionExecutionResult result = revisionCoordinator.executeStructural(
                    MasterDataHierarchyKey.PROCESS,
                    RevisionRequest.central("Create central process " + code, "Central process structural create", null),
                    context -> createProcessInsideRevision(context, code, title, request.parentProcessId(), description, sortOrder, request.validFrom(), request.validTo())
            );
            return MasterDataRevisionMutationResponse.from(result.primaryResult());
        } catch (DataIntegrityViolationException ex) {
            throw duplicateProcessCode(code);
        }
    }

    public MasterDataRevisionMutationResponse updateProcess(UUID processId, UpdateCentralProcessRequest request) {
        long expectedVersion = requireVersion(request.version());
        String title = normalizeTitle(request.title());
        String description = normalizeDescription(request.description());
        int sortOrder = normalizeSortOrder(request.sortOrder());
        MasterDataLifecycleStatus status = requireGeneralInformationStatus(request.status(), "Process");
        validateValidity(request.validFrom(), request.validTo());
        RevisionExecutionResult result = revisionCoordinator.execute(
                RevisionRequest.central(
                        "Update central process " + processId,
                        "Central process General Information update",
                        null
                ),
                context -> updateProcessInsideRevision(
                        context,
                        processId,
                        expectedVersion,
                        title,
                        description,
                        sortOrder,
                        status,
                        request.validFrom(),
                        request.validTo()
                )
        );
        return MasterDataRevisionMutationResponse.from(result.primaryResult());
    }

    public MasterDataRevisionMutationResponse moveProcess(UUID processId, MoveCentralProcessRequest request) {
        long expectedVersion = requireVersion(request.version());
        RevisionExecutionResult result = revisionCoordinator.executeStructural(
                MasterDataHierarchyKey.PROCESS,
                RevisionRequest.central("Move central process " + processId, "Central process hierarchy move", null),
                context -> moveProcessInsideRevision(context, processId, expectedVersion, request.parentProcessId())
        );
        return MasterDataRevisionMutationResponse.from(result.primaryResult());
    }

    public MasterDataRevisionMutationResponse activateProcess(UUID processId, CentralProcessLifecycleCommandRequest request) {
        return processLifecycle(processId, request.version(), RevisionOperationType.ACTIVATE);
    }

    public MasterDataRevisionMutationResponse inactivateProcess(UUID processId, CentralProcessLifecycleCommandRequest request) {
        return processLifecycle(processId, request.version(), RevisionOperationType.INACTIVATE);
    }

    public MasterDataRevisionMutationResponse deleteProcess(UUID processId, CentralProcessLifecycleCommandRequest request) {
        return processLifecycle(processId, request.version(), RevisionOperationType.DELETE);
    }

    public MasterDataRevisionMutationResponse restoreProcess(UUID processId, CentralProcessLifecycleCommandRequest request) {
        return processLifecycle(processId, request.version(), RevisionOperationType.RESTORE);
    }

    public MasterDataRevisionMutationResponse createSubprocess(CreateCentralSubprocessRequest request) {
        String code = normalizeCode(request.code(), "DUPLICATE_SUBPROCESS_CODE");
        String title = normalizeTitle(request.title());
        String description = normalizeDescription(request.description());
        int sortOrder = normalizeSortOrder(request.sortOrder());
        validateValidity(request.validFrom(), request.validTo());
        try {
            RevisionExecutionResult result = revisionCoordinator.executeStructural(
                    MasterDataHierarchyKey.PROCESS,
                    RevisionRequest.central("Create central subprocess " + code, "Central subprocess structural create", null),
                    context -> createSubprocessInsideRevision(context, code, title, request.processId(), description, sortOrder, request.validFrom(), request.validTo())
            );
            return MasterDataRevisionMutationResponse.from(result.primaryResult());
        } catch (DataIntegrityViolationException ex) {
            throw duplicateSubprocessCode(code);
        }
    }

    public MasterDataRevisionMutationResponse updateSubprocess(UUID subprocessId, UpdateCentralSubprocessRequest request) {
        long expectedVersion = requireVersion(request.version());
        String title = normalizeTitle(request.title());
        String description = normalizeDescription(request.description());
        int sortOrder = normalizeSortOrder(request.sortOrder());
        MasterDataLifecycleStatus status = requireGeneralInformationStatus(request.status(), "Subprocess");
        validateValidity(request.validFrom(), request.validTo());
        RevisionExecutionResult result = revisionCoordinator.execute(
                RevisionRequest.central(
                        "Update central subprocess " + subprocessId,
                        "Central subprocess General Information update",
                        null
                ),
                context -> updateSubprocessInsideRevision(
                        context,
                        subprocessId,
                        expectedVersion,
                        title,
                        description,
                        sortOrder,
                        status,
                        request.validFrom(),
                        request.validTo()
                )
        );
        return MasterDataRevisionMutationResponse.from(result.primaryResult());
    }

    public MasterDataRevisionMutationResponse moveSubprocess(UUID subprocessId, MoveCentralSubprocessRequest request) {
        long expectedVersion = requireVersion(request.version());
        RevisionExecutionResult result = revisionCoordinator.executeStructural(
                MasterDataHierarchyKey.PROCESS,
                RevisionRequest.central("Move central subprocess " + subprocessId, "Central subprocess owner move", null),
                context -> moveSubprocessInsideRevision(context, subprocessId, expectedVersion, request.processId())
        );
        return MasterDataRevisionMutationResponse.from(result.primaryResult());
    }

    public MasterDataRevisionMutationResponse activateSubprocess(UUID subprocessId, CentralSubprocessLifecycleCommandRequest request) {
        return subprocessLifecycle(subprocessId, request.version(), RevisionOperationType.ACTIVATE);
    }

    public MasterDataRevisionMutationResponse inactivateSubprocess(UUID subprocessId, CentralSubprocessLifecycleCommandRequest request) {
        return subprocessLifecycle(subprocessId, request.version(), RevisionOperationType.INACTIVATE);
    }

    public MasterDataRevisionMutationResponse deleteSubprocess(UUID subprocessId, CentralSubprocessLifecycleCommandRequest request) {
        return subprocessLifecycle(subprocessId, request.version(), RevisionOperationType.DELETE);
    }

    public MasterDataRevisionMutationResponse restoreSubprocess(UUID subprocessId, CentralSubprocessLifecycleCommandRequest request) {
        return subprocessLifecycle(subprocessId, request.version(), RevisionOperationType.RESTORE);
    }

    private RevisionOperationResult createProcessInsideRevision(
            RevisionExecutionContext context,
            String code,
            String title,
            UUID parentProcessId,
            String description,
            int sortOrder,
            LocalDate validFrom,
            LocalDate validTo
    ) {
        mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.PROCESS);
        UUID actorId = actorProvider.currentActorId();
        Instant now = Instant.now(clock);
        List<CentralProcessEntity> hierarchy = processRepository.findAllByOrderByIdAsc();
        Map<UUID, CentralProcessEntity> byId = indexProcesses(hierarchy);
        CentralProcessEntity entity = findProcessByNormalizedCode(hierarchy, code);
        if (entity == null) {
            UUID processId = UUID.randomUUID();
            validateProcessParent(processId, parentProcessId, byId);
            CentralProcessEntity created = CentralProcessEntity.create(
                    processId,
                    code,
                    title,
                    parentProcessId,
                    description,
                    sortOrder,
                    validFrom,
                    validTo,
                    actorId,
                    now
            );
            CentralProcessEntity saved = processRepository.saveAndFlush(created);
            return completedProcess(context, saved, RevisionOperationType.CREATE, null, null);
        }

        JsonNode before = processSnapshot(entity);
        if (entity.getStatus() == MasterDataLifecycleStatus.ACTIVE) {
            throw duplicateProcessCode(code);
        }
        validateProcessParent(entity.getId(), parentProcessId, byId);
        RevisionOperationType operationType = entity.getStatus() == MasterDataLifecycleStatus.DELETED
                ? RevisionOperationType.RESTORE
                : RevisionOperationType.ACTIVATE;
        long expectedVersion = entity.getVersion();
        if (operationType == RevisionOperationType.RESTORE) {
            entity.restoreFromCreate(title, parentProcessId, description, sortOrder, validFrom, validTo, actorId, now);
        } else {
            entity.reactivateFromCreate(title, parentProcessId, description, sortOrder, validFrom, validTo, actorId, now);
        }
        CentralProcessEntity saved = processRepository.saveAndFlush(entity);
        return completedProcess(context, saved, operationType, expectedVersion, before);
    }

    private RevisionOperationResult updateProcessInsideRevision(
            RevisionExecutionContext context,
            UUID processId,
            long expectedVersion,
            String title,
            String description,
            int sortOrder,
            MasterDataLifecycleStatus status,
            LocalDate validFrom,
            LocalDate validTo
    ) {
        CentralProcessEntity entity = lockProcess(processId);
        assertVersion(entity, expectedVersion, "Process");
        requireMutableProcess(entity);
        JsonNode before = processSnapshot(entity);
        entity.updateDetails(
                title,
                description,
                sortOrder,
                status,
                validFrom,
                validTo,
                actorProvider.currentActorId(),
                Instant.now(clock)
        );
        CentralProcessEntity saved = processRepository.saveAndFlush(entity);
        return completedProcess(context, saved, RevisionOperationType.UPDATE, expectedVersion, before);
    }

    private RevisionOperationResult moveProcessInsideRevision(
            RevisionExecutionContext context,
            UUID processId,
            long expectedVersion,
            UUID parentProcessId
    ) {
        mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.PROCESS);
        Map<UUID, CentralProcessEntity> byId = indexProcesses(
                processRepository.findAllByOrderByIdAsc()
        );
        CentralProcessEntity entity = requireProcessFromSnapshot(byId, processId);
        assertVersion(entity, expectedVersion, "Process");
        requireMutableProcess(entity);
        if (Objects.equals(entity.getParentProcessId(), parentProcessId)) {
            throw invalidHierarchyMove();
        }
        JsonNode before = processSnapshot(entity);
        validateProcessParent(processId, parentProcessId, byId);
        entity.move(parentProcessId, actorProvider.currentActorId(), Instant.now(clock));
        CentralProcessEntity saved = processRepository.saveAndFlush(entity);
        return completedProcess(context, saved, RevisionOperationType.UPDATE, expectedVersion, before);
    }

    private MasterDataRevisionMutationResponse processLifecycle(UUID processId, Long version, RevisionOperationType operationType) {
        long expectedVersion = requireVersion(version);
        RevisionRequest revisionRequest = RevisionRequest.central(
                operationType.name() + " central process " + processId,
                "Central process lifecycle command",
                null
        );
        RevisionExecutionResult result = operationType == RevisionOperationType.DELETE
                || operationType == RevisionOperationType.RESTORE
                ? revisionCoordinator.executeStructural(
                        MasterDataHierarchyKey.PROCESS,
                        revisionRequest,
                        context -> processLifecycleInsideRevision(context, processId, expectedVersion, operationType)
                )
                : revisionCoordinator.execute(
                        revisionRequest,
                        context -> processLifecycleInsideRevision(context, processId, expectedVersion, operationType)
                );
        return MasterDataRevisionMutationResponse.from(result.primaryResult());
    }

    private RevisionOperationResult processLifecycleInsideRevision(
            RevisionExecutionContext context,
            UUID processId,
            long expectedVersion,
            RevisionOperationType operationType
    ) {
        Map<UUID, CentralProcessEntity> hierarchyById = null;
        CentralProcessEntity entity;
        if (operationType == RevisionOperationType.DELETE || operationType == RevisionOperationType.RESTORE) {
            mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.PROCESS);
            hierarchyById = indexProcesses(processRepository.findAllByOrderByIdAsc());
            entity = requireProcessFromSnapshot(hierarchyById, processId);
        } else {
            entity = lockProcess(processId);
        }
        assertVersion(entity, expectedVersion, "Process");
        validateProcessLifecycleTransition(entity, operationType);
        if (operationType == RevisionOperationType.DELETE) {
            validateProcessDeleteDependencies(processId, hierarchyById);
        }
        if (operationType == RevisionOperationType.RESTORE) {
            validateProcessRestoreParent(entity, hierarchyById);
            validateValidity(entity.getValidFrom(), entity.getValidTo());
        }
        JsonNode before = processSnapshot(entity);
        UUID actorId = actorProvider.currentActorId();
        Instant now = Instant.now(clock);
        switch (operationType) {
            case ACTIVATE -> entity.activate(actorId, now);
            case INACTIVATE -> entity.inactivate(actorId, now);
            case DELETE -> entity.delete(actorId, now);
            case RESTORE -> entity.restore(actorId, now);
            default -> throw new IllegalArgumentException("Unsupported process lifecycle operation");
        }
        CentralProcessEntity saved = processRepository.saveAndFlush(entity);
        return completedProcess(context, saved, operationType, expectedVersion, before);
    }

    private RevisionOperationResult createSubprocessInsideRevision(
            RevisionExecutionContext context,
            String code,
            String title,
            UUID processId,
            String description,
            int sortOrder,
            LocalDate validFrom,
            LocalDate validTo
    ) {
        mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.PROCESS);
        UUID actorId = actorProvider.currentActorId();
        Instant now = Instant.now(clock);
        Map<UUID, CentralProcessEntity> processById = indexProcesses(
                processRepository.findAllByOrderByIdAsc()
        );
        requireSubprocessOwner(processId, processById);
        CentralSubprocessEntity entity = subprocessRepository.findByNormalizedCode(code).orElse(null);
        if (entity == null) {
            CentralSubprocessEntity created = CentralSubprocessEntity.create(
                    UUID.randomUUID(),
                    code,
                    title,
                    processId,
                    description,
                    sortOrder,
                    validFrom,
                    validTo,
                    actorId,
                    now
            );
            CentralSubprocessEntity saved = subprocessRepository.saveAndFlush(created);
            return completedSubprocess(context, saved, RevisionOperationType.CREATE, null, null);
        }

        JsonNode before = subprocessSnapshot(entity);
        if (entity.getStatus() == MasterDataLifecycleStatus.ACTIVE) {
            throw duplicateSubprocessCode(code);
        }
        RevisionOperationType operationType = entity.getStatus() == MasterDataLifecycleStatus.DELETED
                ? RevisionOperationType.RESTORE
                : RevisionOperationType.ACTIVATE;
        long expectedVersion = entity.getVersion();
        if (operationType == RevisionOperationType.RESTORE) {
            entity.restoreFromCreate(title, processId, description, sortOrder, validFrom, validTo, actorId, now);
        } else {
            entity.reactivateFromCreate(title, processId, description, sortOrder, validFrom, validTo, actorId, now);
        }
        CentralSubprocessEntity saved = subprocessRepository.saveAndFlush(entity);
        return completedSubprocess(context, saved, operationType, expectedVersion, before);
    }

    private RevisionOperationResult updateSubprocessInsideRevision(
            RevisionExecutionContext context,
            UUID subprocessId,
            long expectedVersion,
            String title,
            String description,
            int sortOrder,
            MasterDataLifecycleStatus status,
            LocalDate validFrom,
            LocalDate validTo
    ) {
        CentralSubprocessEntity entity = lockSubprocess(subprocessId);
        assertVersion(entity, expectedVersion, "Subprocess");
        requireMutableSubprocess(entity);
        JsonNode before = subprocessSnapshot(entity);
        entity.updateDetails(
                title,
                description,
                sortOrder,
                status,
                validFrom,
                validTo,
                actorProvider.currentActorId(),
                Instant.now(clock)
        );
        CentralSubprocessEntity saved = subprocessRepository.saveAndFlush(entity);
        return completedSubprocess(context, saved, RevisionOperationType.UPDATE, expectedVersion, before);
    }

    private RevisionOperationResult moveSubprocessInsideRevision(
            RevisionExecutionContext context,
            UUID subprocessId,
            long expectedVersion,
            UUID processId
    ) {
        mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.PROCESS);
        CentralSubprocessEntity entity = findSubprocessIncludingDeleted(subprocessId);
        assertVersion(entity, expectedVersion, "Subprocess");
        requireMutableSubprocess(entity);
        if (Objects.equals(entity.getProcessId(), processId)) {
            throw invalidHierarchyMove();
        }
        Map<UUID, CentralProcessEntity> processById = indexProcesses(
                processRepository.findAllByOrderByIdAsc()
        );
        requireSubprocessOwner(processId, processById);
        JsonNode before = subprocessSnapshot(entity);
        entity.move(processId, actorProvider.currentActorId(), Instant.now(clock));
        CentralSubprocessEntity saved = subprocessRepository.saveAndFlush(entity);
        return completedSubprocess(context, saved, RevisionOperationType.UPDATE, expectedVersion, before);
    }

    private MasterDataRevisionMutationResponse subprocessLifecycle(UUID subprocessId, Long version, RevisionOperationType operationType) {
        long expectedVersion = requireVersion(version);
        RevisionRequest revisionRequest = RevisionRequest.central(
                operationType.name() + " central subprocess " + subprocessId,
                "Central subprocess lifecycle command",
                null
        );
        RevisionExecutionResult result = operationType == RevisionOperationType.DELETE
                || operationType == RevisionOperationType.RESTORE
                ? revisionCoordinator.executeStructural(
                        MasterDataHierarchyKey.PROCESS,
                        revisionRequest,
                        context -> subprocessLifecycleInsideRevision(context, subprocessId, expectedVersion, operationType)
                )
                : revisionCoordinator.execute(
                        revisionRequest,
                        context -> subprocessLifecycleInsideRevision(context, subprocessId, expectedVersion, operationType)
                );
        return MasterDataRevisionMutationResponse.from(result.primaryResult());
    }

    private RevisionOperationResult subprocessLifecycleInsideRevision(
            RevisionExecutionContext context,
            UUID subprocessId,
            long expectedVersion,
            RevisionOperationType operationType
    ) {
        boolean structural = operationType == RevisionOperationType.DELETE
                || operationType == RevisionOperationType.RESTORE;
        if (structural) {
            mutationGuard.requireHierarchyGuard(context, MasterDataHierarchyKey.PROCESS);
        }
        CentralSubprocessEntity entity = structural
                ? findSubprocessIncludingDeleted(subprocessId)
                : lockSubprocess(subprocessId);
        assertVersion(entity, expectedVersion, "Subprocess");
        validateSubprocessLifecycleTransition(entity, operationType);
        if (operationType == RevisionOperationType.DELETE) {
            validateSubprocessDeleteDependencies(subprocessId);
        }
        if (operationType == RevisionOperationType.RESTORE) {
            Map<UUID, CentralProcessEntity> processById = indexProcesses(
                    processRepository.findAllByOrderByIdAsc()
            );
            requireSubprocessOwner(entity.getProcessId(), processById);
            validateValidity(entity.getValidFrom(), entity.getValidTo());
        }
        JsonNode before = subprocessSnapshot(entity);
        UUID actorId = actorProvider.currentActorId();
        Instant now = Instant.now(clock);
        switch (operationType) {
            case ACTIVATE -> entity.activate(actorId, now);
            case INACTIVATE -> entity.inactivate(actorId, now);
            case DELETE -> entity.delete(actorId, now);
            case RESTORE -> entity.restore(actorId, now);
            default -> throw new IllegalArgumentException("Unsupported subprocess lifecycle operation");
        }
        CentralSubprocessEntity saved = subprocessRepository.saveAndFlush(entity);
        return completedSubprocess(context, saved, operationType, expectedVersion, before);
    }

    private RevisionOperationResult completedProcess(
            RevisionExecutionContext context,
            CentralProcessEntity entity,
            RevisionOperationType operationType,
            Long expectedVersion,
            JsonNode beforeSnapshot
    ) {
        MasterDataMutationResult primary = new MasterDataMutationResult(entity.getId(), context.revisionId(), entity.getVersion());
        return RevisionOperationResult.completed(
                context,
                primary,
                List.of(RevisionContentResult.completed(
                        RevisionEntityType.CENTRAL_PROCESS,
                        entity.getId(),
                        operationType,
                        expectedVersion,
                        beforeSnapshot,
                        processSnapshot(entity),
                        entity.getVersion(),
                        validationSnapshot()
                ))
        );
    }

    private RevisionOperationResult completedSubprocess(
            RevisionExecutionContext context,
            CentralSubprocessEntity entity,
            RevisionOperationType operationType,
            Long expectedVersion,
            JsonNode beforeSnapshot
    ) {
        MasterDataMutationResult primary = new MasterDataMutationResult(entity.getId(), context.revisionId(), entity.getVersion());
        return RevisionOperationResult.completed(
                context,
                primary,
                List.of(RevisionContentResult.completed(
                        RevisionEntityType.CENTRAL_SUBPROCESS,
                        entity.getId(),
                        operationType,
                        expectedVersion,
                        beforeSnapshot,
                        subprocessSnapshot(entity),
                        entity.getVersion(),
                        validationSnapshot()
                ))
        );
    }

    private void validateProcessParent(
            UUID processId,
            UUID parentProcessId,
            Map<UUID, CentralProcessEntity> byId
    ) {
        if (parentProcessId == null) {
            return;
        }
        if (processId.equals(parentProcessId)) {
            throw hierarchySelfParent();
        }
        CentralProcessEntity parent = byId.get(parentProcessId);
        if (parent == null || parent.getStatus() == DELETED) {
            throw parentProcessNotFound(parentProcessId);
        }
        validateNoProcessCycle(processId, parentProcessId, byId);
    }

    private void validateNoProcessCycle(UUID processId, UUID parentProcessId, Map<UUID, CentralProcessEntity> byId) {
        Set<UUID> visited = new HashSet<>();
        UUID current = parentProcessId;
        while (current != null) {
            if (!visited.add(current)) {
                throw hierarchyCycle();
            }
            if (processId.equals(current)) {
                throw hierarchyCycle();
            }
            CentralProcessEntity parent = byId.get(current);
            if (parent == null || parent.getStatus() == DELETED) {
                throw parentProcessNotFound(current);
            }
            current = parent.getParentProcessId();
        }
    }

    private void validateProcessRestoreParent(
            CentralProcessEntity entity,
            Map<UUID, CentralProcessEntity> byId
    ) {
        UUID parentProcessId = entity.getParentProcessId();
        if (parentProcessId == null) {
            return;
        }
        CentralProcessEntity parent = byId.get(parentProcessId);
        if (parent == null || parent.getStatus() == DELETED) {
            throw parentProcessNotFound(parentProcessId);
        }
    }

    private CentralProcessEntity requireSubprocessOwner(
            UUID processId,
            Map<UUID, CentralProcessEntity> byId
    ) {
        if (processId == null) {
            throw new NotFoundException("PROCESS_FOR_SUBPROCESS_NOT_FOUND", "error.masterdata.v2.processForSubprocessNotFound", "Process for subprocess is required");
        }
        CentralProcessEntity process = byId.get(processId);
        if (process == null || process.getStatus() == DELETED) {
            throw new NotFoundException("PROCESS_FOR_SUBPROCESS_NOT_FOUND", "error.masterdata.v2.processForSubprocessNotFound", "Process for subprocess not found: " + processId, processId);
        }
        return process;
    }

    private void validateProcessDeleteDependencies(
            UUID processId,
            Map<UUID, CentralProcessEntity> byId
    ) {
        boolean hasProcessChildren = byId.values().stream().anyMatch(process ->
                process.getStatus() != DELETED && processId.equals(process.getParentProcessId()));
        if (hasProcessChildren
                || subprocessRepository.existsByProcessIdAndStatusNot(processId, DELETED)) {
            throw new ConflictException("DEPENDENT_CHILDREN_EXIST", "error.masterdata.v2.dependentChildrenExist", "Process has child processes or subprocesses: " + processId, processId);
        }
        if (dependencyChecker.centralProcessHasApprovedDependencies(processId)) {
            throw new ConflictException("DEPENDENT_MASTER_DATA_EXISTS", "error.masterdata.v2.dependentMasterDataExists", "Process has dependent Master Data references: " + processId, processId);
        }
    }

    private void validateSubprocessDeleteDependencies(UUID subprocessId) {
        if (dependencyChecker.centralSubprocessHasApprovedDependencies(subprocessId)) {
            throw new ConflictException("DEPENDENT_MASTER_DATA_EXISTS", "error.masterdata.v2.dependentMasterDataExists", "Subprocess has dependent Master Data references: " + subprocessId, subprocessId);
        }
    }

    private CentralProcessEntity lockProcess(UUID processId) {
        return processRepository.lockById(processId)
                .orElseThrow(() -> processNotFound(processId));
    }

    private CentralProcessEntity requireProcessFromSnapshot(
            Map<UUID, CentralProcessEntity> byId,
            UUID processId
    ) {
        CentralProcessEntity process = byId.get(processId);
        if (process == null) {
            throw processNotFound(processId);
        }
        return process;
    }

    private void requireMutableProcess(CentralProcessEntity entity) {
        if (entity.getStatus() == DELETED) {
            throw processNotFound(entity.getId());
        }
    }

    private void requireMutableSubprocess(CentralSubprocessEntity entity) {
        if (entity.getStatus() == DELETED) {
            throw subprocessNotFound(entity.getId());
        }
    }

    private void validateProcessLifecycleTransition(CentralProcessEntity entity, RevisionOperationType operationType) {
        validateLifecycleTransition(entity.getStatus(), operationType, () -> processNotFound(entity.getId()), "process");
    }

    private void validateSubprocessLifecycleTransition(CentralSubprocessEntity entity, RevisionOperationType operationType) {
        validateLifecycleTransition(entity.getStatus(), operationType, () -> subprocessNotFound(entity.getId()), "subprocess");
    }

    private void validateLifecycleTransition(
            MasterDataLifecycleStatus current,
            RevisionOperationType operationType,
            java.util.function.Supplier<NotFoundException> deletedNotFound,
            String family
    ) {
        if (current == DELETED && operationType != RevisionOperationType.RESTORE) {
            throw deletedNotFound.get();
        }

        boolean valid = switch (operationType) {
            case ACTIVATE -> current == MasterDataLifecycleStatus.INACTIVE;
            case INACTIVATE -> current == MasterDataLifecycleStatus.ACTIVE;
            case DELETE -> current == MasterDataLifecycleStatus.ACTIVE || current == MasterDataLifecycleStatus.INACTIVE;
            case RESTORE -> current == DELETED;
            default -> false;
        };
        if (!valid) {
            throw new UnprocessableEntityException(
                    "INVALID_LIFECYCLE_TRANSITION",
                    "error.masterdata.v2.invalidLifecycleTransition",
                    "Invalid " + family + " lifecycle transition from " + current + " using " + operationType
            );
        }
    }

    private CentralSubprocessEntity lockSubprocess(UUID subprocessId) {
        return subprocessRepository.lockById(subprocessId)
                .orElseThrow(() -> subprocessNotFound(subprocessId));
    }

    private CentralSubprocessEntity findSubprocessIncludingDeleted(UUID subprocessId) {
        return subprocessRepository.findById(subprocessId)
                .orElseThrow(() -> subprocessNotFound(subprocessId));
    }

    private CentralProcessEntity findReadableProcess(UUID processId) {
        return processRepository.findByIdAndStatusNot(processId, DELETED)
                .orElseThrow(() -> processNotFound(processId));
    }

    private CentralSubprocessEntity findReadableSubprocess(UUID subprocessId) {
        return subprocessRepository.findByIdAndStatusNot(subprocessId, DELETED)
                .orElseThrow(() -> subprocessNotFound(subprocessId));
    }

    private void assertVersion(CentralProcessEntity entity, long expectedVersion, String label) {
        if (entity.getVersion() != expectedVersion) {
            throw new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict", label + " version conflict: " + entity.getId(), entity.getId());
        }
    }

    private void assertVersion(CentralSubprocessEntity entity, long expectedVersion, String label) {
        if (entity.getVersion() != expectedVersion) {
            throw new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict", label + " version conflict: " + entity.getId(), entity.getId());
        }
    }

    private long requireVersion(Long version) {
        if (version == null || version < 0) {
            throw new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict", "Expected version is required", version);
        }
        return version;
    }

    private String normalizeCode(String code, String errorCode) {
        if (code == null || code.isBlank()) {
            throw new UnprocessableEntityException(errorCode, "error.masterdata.v2.codeRequired", "Code is required");
        }
        String normalized = code.trim().toUpperCase(Locale.ROOT);
        if (normalized.getBytes(StandardCharsets.UTF_8).length > 64) {
            throw new UnprocessableEntityException("INVALID_CODE_LENGTH", "error.masterdata.v2.codeLength", "Code exceeds 64 bytes", normalized);
        }
        return normalized;
    }

    private String normalizeTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new UnprocessableEntityException("INVALID_TITLE", "error.masterdata.v2.titleRequired", "Title is required");
        }
        String normalized = title.trim();
        if (normalized.length() > 255) {
            throw new UnprocessableEntityException("INVALID_TITLE", "error.masterdata.v2.titleLength", "Title exceeds 255 characters", normalized);
        }
        return normalized;
    }

    private String normalizeDescription(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        return description.trim();
    }

    private int normalizeSortOrder(Integer sortOrder) {
        int normalized = sortOrder == null ? 0 : sortOrder;
        if (normalized < 0) {
            throw new UnprocessableEntityException("INVALID_SORT_ORDER", "error.masterdata.v2.invalidSortOrder", "Sort order must not be negative", normalized);
        }
        return normalized;
    }

    private void validateValidity(LocalDate validFrom, LocalDate validTo) {
        if (validFrom != null && validTo != null && validTo.isBefore(validFrom)) {
            throw new UnprocessableEntityException("INVALID_VALIDITY_RANGE", "error.masterdata.v2.invalidValidityRange", "Validity range is invalid");
        }
    }

    private MasterDataLifecycleStatus requireGeneralInformationStatus(
            MasterDataLifecycleStatus status,
            String family
    ) {
        if (status == MasterDataLifecycleStatus.ACTIVE || status == MasterDataLifecycleStatus.INACTIVE) {
            return status;
        }
        throw new UnprocessableEntityException(
                "INVALID_LIFECYCLE_TRANSITION",
                "error.masterdata.v2.invalidLifecycleTransition",
                family + " Update accepts only ACTIVE or INACTIVE"
        );
    }

    private ConflictException duplicateProcessCode(String code) {
        return new ConflictException("DUPLICATE_PROCESS_CODE", "error.masterdata.v2.duplicateProcessCode", "Duplicate process code: " + code, code);
    }

    private ConflictException duplicateSubprocessCode(String code) {
        return new ConflictException("DUPLICATE_SUBPROCESS_CODE", "error.masterdata.v2.duplicateSubprocessCode", "Duplicate subprocess code: " + code, code);
    }

    private NotFoundException processNotFound(UUID processId) {
        return new NotFoundException("PROCESS_NOT_FOUND", "error.masterdata.v2.processNotFound", "Process not found: " + processId, processId);
    }

    private NotFoundException subprocessNotFound(UUID subprocessId) {
        return new NotFoundException("SUBPROCESS_NOT_FOUND", "error.masterdata.v2.subprocessNotFound", "Subprocess not found: " + subprocessId, subprocessId);
    }

    private NotFoundException parentProcessNotFound(UUID parentProcessId) {
        return new NotFoundException("PARENT_PROCESS_NOT_FOUND", "error.masterdata.v2.parentProcessNotFound", "Parent process not found: " + parentProcessId, parentProcessId);
    }

    private UnprocessableEntityException hierarchySelfParent() {
        return new UnprocessableEntityException("HIERARCHY_SELF_PARENT", "error.masterdata.v2.hierarchySelfParent", "Process cannot parent itself");
    }

    private UnprocessableEntityException hierarchyCycle() {
        return new UnprocessableEntityException("HIERARCHY_CYCLE", "error.masterdata.v2.hierarchyCycle", "Process hierarchy cycle detected");
    }

    private UnprocessableEntityException invalidHierarchyMove() {
        return new UnprocessableEntityException(
                "INVALID_HIERARCHY_MOVE",
                "error.masterdata.v2.invalidHierarchyMove",
                "Move destination must differ from the current parent"
        );
    }

    private MasterDataLifecycleStatus parseLifecycleFilter(String lifecycleStatus) {
        if (lifecycleStatus == null) {
            return null;
        }
        if (DELETED.name().equals(lifecycleStatus)) {
            return DELETED;
        }
        throw new UnprocessableEntityException(
                "INVALID_LIFECYCLE_FILTER",
                "error.masterdata.v2.invalidLifecycleFilter",
                "Only the deleted lifecycle filter is supported"
        );
    }

    private CentralProcessEntity findProcessByNormalizedCode(
            List<CentralProcessEntity> processes,
            String code
    ) {
        return processes.stream()
                .filter(process -> process.getCode().equalsIgnoreCase(code))
                .findFirst()
                .orElse(null);
    }

    private Map<UUID, CentralProcessEntity> indexProcesses(List<CentralProcessEntity> processes) {
        Map<UUID, CentralProcessEntity> byId = new HashMap<>();
        for (CentralProcessEntity process : processes) {
            byId.put(process.getId(), process);
        }
        return byId;
    }

    private List<ProcessTreeNodeResponse> buildTree(
            List<CentralProcessEntity> processes,
            List<CentralSubprocessEntity> subprocesses
    ) {
        Map<UUID, MutableProcessTreeNode> processNodes = new HashMap<>();
        for (CentralProcessEntity process : processes) {
            processNodes.put(process.getId(), MutableProcessTreeNode.process(process));
        }

        List<MutableProcessTreeNode> roots = new ArrayList<>();
        for (CentralProcessEntity process : processes) {
            MutableProcessTreeNode node = processNodes.get(process.getId());
            UUID parentId = process.getParentProcessId();
            if (parentId == null) {
                roots.add(node);
                continue;
            }
            MutableProcessTreeNode parent = processNodes.get(parentId);
            if (parent == null) {
                throw new UnprocessableEntityException("HIERARCHY_DEPTH_INVALID", "error.masterdata.v2.hierarchyDepthInvalid", "Process hierarchy has a missing non-deleted parent: " + parentId, parentId);
            }
            parent.children.add(node);
        }

        detectProcessTreeCycles(processNodes);

        for (CentralSubprocessEntity subprocess : subprocesses) {
            MutableProcessTreeNode parent = processNodes.get(subprocess.getProcessId());
            if (parent == null) {
                throw new UnprocessableEntityException("HIERARCHY_DEPTH_INVALID", "error.masterdata.v2.hierarchyDepthInvalid", "Subprocess has a missing non-deleted process: " + subprocess.getProcessId(), subprocess.getProcessId());
            }
            parent.children.add(MutableProcessTreeNode.subprocess(subprocess));
        }

        roots.sort(MutableProcessTreeNode.ORDER);
        return roots.stream().map(this::toTreeResponse).toList();
    }

    private void detectProcessTreeCycles(Map<UUID, MutableProcessTreeNode> processNodes) {
        Set<UUID> visited = new HashSet<>();
        Set<UUID> visiting = new HashSet<>();
        for (UUID id : processNodes.keySet()) {
            detectProcessTreeCycles(id, processNodes, visited, visiting);
        }
    }

    private void detectProcessTreeCycles(
            UUID id,
            Map<UUID, MutableProcessTreeNode> processNodes,
            Set<UUID> visited,
            Set<UUID> visiting
    ) {
        if (visited.contains(id)) {
            return;
        }
        if (!visiting.add(id)) {
            throw hierarchyCycle();
        }
        CentralProcessEntity process = processNodes.get(id).process;
        UUID parentId = process.getParentProcessId();
        if (parentId != null && processNodes.containsKey(parentId)) {
            detectProcessTreeCycles(parentId, processNodes, visited, visiting);
        }
        visiting.remove(id);
        visited.add(id);
    }

    private ProcessTreeNodeResponse toTreeResponse(MutableProcessTreeNode node) {
        node.children.sort(MutableProcessTreeNode.ORDER);
        if (node.nodeType == ProcessTreeNodeType.PROCESS) {
            CentralProcessEntity process = node.process;
            return new ProcessTreeNodeResponse(
                    process.getId(),
                    ProcessTreeNodeType.PROCESS,
                    process.getCode(),
                    process.getTitle(),
                    process.getParentProcessId(),
                    process.getSortOrder(),
                    process.getStatus(),
                    process.getValidFrom(),
                    process.getValidTo(),
                    process.getVersion(),
                    node.children.stream().map(this::toTreeResponse).toList()
            );
        }
        CentralSubprocessEntity subprocess = node.subprocess;
        return new ProcessTreeNodeResponse(
                subprocess.getId(),
                ProcessTreeNodeType.SUBPROCESS,
                subprocess.getCode(),
                subprocess.getTitle(),
                subprocess.getProcessId(),
                subprocess.getSortOrder(),
                subprocess.getStatus(),
                subprocess.getValidFrom(),
                subprocess.getValidTo(),
                subprocess.getVersion(),
                List.of()
        );
    }

    private CentralProcessResponse toProcessResponse(CentralProcessEntity entity) {
        return new CentralProcessResponse(
                entity.getId(),
                entity.getCode(),
                entity.getTitle(),
                entity.getParentProcessId(),
                entity.getDescription(),
                entity.getSortOrder(),
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

    private CentralSubprocessResponse toSubprocessResponse(CentralSubprocessEntity entity) {
        return new CentralSubprocessResponse(
                entity.getId(),
                entity.getCode(),
                entity.getTitle(),
                entity.getProcessId(),
                entity.getDescription(),
                entity.getSortOrder(),
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

    private JsonNode processSnapshot(CentralProcessEntity entity) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("id", entity.getId());
        snapshot.put("code", entity.getCode());
        snapshot.put("title", entity.getTitle());
        snapshot.put("parentProcessId", entity.getParentProcessId());
        snapshot.put("description", entity.getDescription());
        snapshot.put("sortOrder", entity.getSortOrder());
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

    private JsonNode subprocessSnapshot(CentralSubprocessEntity entity) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("id", entity.getId());
        snapshot.put("code", entity.getCode());
        snapshot.put("title", entity.getTitle());
        snapshot.put("processId", entity.getProcessId());
        snapshot.put("description", entity.getDescription());
        snapshot.put("sortOrder", entity.getSortOrder());
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

    private static final class MutableProcessTreeNode {
        private static final Comparator<MutableProcessTreeNode> ORDER = Comparator
                .comparingInt(MutableProcessTreeNode::sortOrder)
                .thenComparing(MutableProcessTreeNode::title, String.CASE_INSENSITIVE_ORDER)
                .thenComparing(MutableProcessTreeNode::id);

        private final ProcessTreeNodeType nodeType;
        private final CentralProcessEntity process;
        private final CentralSubprocessEntity subprocess;
        private final List<MutableProcessTreeNode> children = new ArrayList<>();

        private MutableProcessTreeNode(ProcessTreeNodeType nodeType, CentralProcessEntity process, CentralSubprocessEntity subprocess) {
            this.nodeType = nodeType;
            this.process = process;
            this.subprocess = subprocess;
        }

        private static MutableProcessTreeNode process(CentralProcessEntity process) {
            return new MutableProcessTreeNode(ProcessTreeNodeType.PROCESS, process, null);
        }

        private static MutableProcessTreeNode subprocess(CentralSubprocessEntity subprocess) {
            return new MutableProcessTreeNode(ProcessTreeNodeType.SUBPROCESS, null, subprocess);
        }

        private UUID id() {
            return nodeType == ProcessTreeNodeType.PROCESS ? process.getId() : subprocess.getId();
        }

        private String title() {
            return nodeType == ProcessTreeNodeType.PROCESS ? process.getTitle() : subprocess.getTitle();
        }

        private int sortOrder() {
            return nodeType == ProcessTreeNodeType.PROCESS ? process.getSortOrder() : subprocess.getSortOrder();
        }
    }
}
