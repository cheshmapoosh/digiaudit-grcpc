package com.digiaudit.grcpc.modules.organization.application;

import com.digiaudit.grcpc.common.exception.*;
import com.digiaudit.grcpc.common.security.*;
import com.digiaudit.grcpc.modules.datasetprofile.application.ProfileAccessService;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.*;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import com.digiaudit.grcpc.modules.organization.api.dto.*;
import com.digiaudit.grcpc.modules.organization.domain.*;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationOwnerAssignmentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service @RequiredArgsConstructor
public class OrganizationOwnerAssignmentService {
    private final OrganizationOwnerAssignmentRepository repository;
    private final ProfileAccessService access;
    private final CurrentUserProvider user;
    private final RevisionMutationGuard guard;
    private final ObjectMapper json;

    public List<OrganizationOwnerAssignmentRepository.OwnerOption> options() {
        access.requireManager(); return repository.eligibleUsers(ProfileContext.requireId());
    }
    public List<OrganizationOwnerView> list(UUID organizationId) {
        return list(organizationId, false);
    }
    public List<OrganizationOwnerView> list(UUID organizationId, boolean deleted) {
        Map<UUID, OrganizationOwnerAssignmentRepository.OwnerOption> eligible = new HashMap<>();
        repository.eligibleUsers(ProfileContext.requireId()).forEach(option -> eligible.put(option.id(), option));
        return repository.assignments(ProfileContext.requireId(), organizationId).stream().filter(row -> deleted == "DELETED".equals(row.status())).map(row -> {
            var identity = eligible.get(row.userId());
            boolean valid = identity != null;
            if (!valid) identity = repository.userIdentity(row.userId());
            return new OrganizationOwnerView(row.id(), row.profileId(), row.organizationId(), row.userId(), identity.displayLabel(), identity.username(), identity.roleCode(), valid, row.status(), row.version());
        }).toList();
    }
    public Set<UUID> directlyOwned(UUID userId) {
        if (repository.eligibleUsers(ProfileContext.requireId()).stream().noneMatch(option -> option.id().equals(userId))) return Set.of();
        Set<UUID> result = new HashSet<>();
        repository.activeForUser(ProfileContext.requireId(), userId).forEach(row -> result.add(row.organizationId()));
        return result;
    }
    public record PlannedOwner(OrganizationOwnerChange change, OrganizationOwnerAssignment before) {}
    public record Plan(UUID organizationId, List<PlannedOwner> changes) {}
    @org.springframework.transaction.annotation.Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public Plan prepare(RevisionExecutionContext context, UUID organizationId, List<OrganizationOwnerChange> changes) {
        if (changes == null || changes.isEmpty()) return new Plan(organizationId, List.of());
        guard.requireHierarchyGuard(context, MasterDataHierarchyKey.ORGANIZATION);
        access.requireManager();
        Map<UUID, OrganizationOwnerAssignment> current = new HashMap<>();
        for (var change : changes) if (change == null || change.userId() == null || change.operation() == null) throw invalid("INVALID_OWNER_ASSIGNMENT");
        changes.stream().map(OrganizationOwnerChange::userId).distinct().sorted(Comparator.comparing(UUID::toString)).forEach(id ->
            repository.lockAssignment(ProfileContext.requireId(), organizationId, id).ifPresent(row -> current.put(id, row)));
        Set<UUID> eligible = new HashSet<>();
        repository.eligibleUsers(ProfileContext.requireId()).forEach(option -> eligible.add(option.id()));
        Set<UUID> seen = new HashSet<>();
        for (var change : changes) {
            if (change == null || change.operation() == null || change.userId() == null || !seen.add(change.userId())) throw invalid("INVALID_OWNER_ASSIGNMENT");
            var row = current.get(change.userId());
            if (change.operation() == OrganizationOwnerChange.Operation.CREATE_OR_RESTORE) {
                if (!eligible.contains(change.userId())) throw invalid("OWNER_NOT_ELIGIBLE");
                if (change.assignmentId() != null || change.version() != null) throw invalid("INVALID_OWNER_ASSIGNMENT");
                if (row != null && !"DELETED".equals(row.status())) throw invalid("DUPLICATE_OWNER_ASSIGNMENT");
            } else if (row == null || !row.id().equals(change.assignmentId())
                    || change.version() == null || change.version() != row.version()) {
                throw new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict", "Organization owner assignment changed");
            }
            if (change.operation() == OrganizationOwnerChange.Operation.ACTIVATE || change.operation() == OrganizationOwnerChange.Operation.RESTORE) {
                if (!eligible.contains(change.userId())) throw invalid("OWNER_NOT_ELIGIBLE");
            }
            if (row != null && change.operation() != OrganizationOwnerChange.Operation.CREATE_OR_RESTORE) {
                if ((change.operation() == OrganizationOwnerChange.Operation.RESTORE) != "DELETED".equals(row.status())) throw invalid("INVALID_OWNER_ASSIGNMENT");
            }
        }
        return new Plan(organizationId, changes.stream().sorted(Comparator.comparing(value -> value.userId().toString()))
            .map(change -> new PlannedOwner(change, current.get(change.userId()))).toList());
    }
    public List<RevisionContentResult> apply(RevisionExecutionContext context, UUID organizationId, List<OrganizationOwnerChange> changes) {
        return apply(context, prepare(context, organizationId, changes));
    }
    @org.springframework.transaction.annotation.Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public List<RevisionContentResult> apply(RevisionExecutionContext context, Plan plan) {
        if (plan.changes().isEmpty()) return List.of();
        guard.requireHierarchyGuard(context, MasterDataHierarchyKey.ORGANIZATION);
        Map<UUID, OrganizationOwnerAssignment> current = new HashMap<>();
        var changes = plan.changes().stream().map(PlannedOwner::change).toList();
        plan.changes().forEach(item -> { if (item.before() != null) current.put(item.change().userId(), item.before()); });
        UUID organizationId = plan.organizationId();
        List<RevisionContentResult> results = new ArrayList<>();
        for (var change : changes.stream().sorted(Comparator.comparing(value -> value.userId().toString())).toList()) {
            var before = current.get(change.userId());
            String target = switch (change.operation()) {
                case CREATE_OR_RESTORE, ACTIVATE, RESTORE -> "ACTIVE";
                case INACTIVATE -> "INACTIVE";
                case DELETE -> "DELETED";
            };
            if (before != null && target.equals(before.status())) continue;
            var after = before == null ? repository.insert(ProfileContext.requireId(), organizationId, change.userId(), user.getCurrentUserIdOrNull())
                    : repository.changeStatus(before, target, user.getCurrentUserIdOrNull());
            results.add(RevisionContentResult.completed(RevisionEntityType.ORGANIZATION_OWNER_ASSIGNMENT, after.id(),
                before == null ? RevisionOperationType.CREATE : "DELETED".equals(before.status()) ? RevisionOperationType.RESTORE : RevisionOperationType.valueOf(change.operation().name()),
                before == null ? null : before.version(), before == null ? null : json.valueToTree(before), json.valueToTree(after), after.version(), json.valueToTree(Map.of("validated", true))));
        }
        return List.copyOf(results);
    }
    private UnprocessableEntityException invalid(String code) {
        var failure = new UnprocessableEntityException(code, "organization.ownerAssignment.invalid", "Choose an eligible organization owner from the selected profile");
        failure.putErrorContext("relationFamily", "O1");
        return failure;
    }
}
