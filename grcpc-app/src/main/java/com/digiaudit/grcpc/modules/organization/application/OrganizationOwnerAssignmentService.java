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
        Map<UUID, OrganizationOwnerAssignmentRepository.OwnerOption> eligible = new HashMap<>();
        repository.eligibleUsers(ProfileContext.requireId()).forEach(option -> eligible.put(option.id(), option));
        return repository.assignments(ProfileContext.requireId(), organizationId).stream().filter(row -> "ACTIVE".equals(row.status())).map(row -> {
            var identity = eligible.get(row.userId());
            boolean valid = identity != null;
            if (!valid) identity = repository.userIdentity(row.userId());
            return new OrganizationOwnerView(row.id(), row.profileId(), row.organizationId(), row.userId(), identity.displayLabel(), identity.username(), identity.roleCode(), valid, row.version());
        }).toList();
    }
    public Set<UUID> directlyOwned(UUID userId) {
        if (repository.eligibleUsers(ProfileContext.requireId()).stream().noneMatch(option -> option.id().equals(userId))) return Set.of();
        Set<UUID> result = new HashSet<>();
        repository.activeForUser(ProfileContext.requireId(), userId).forEach(row -> result.add(row.organizationId()));
        return result;
    }
    public List<RevisionContentResult> apply(RevisionExecutionContext context, UUID organizationId, List<OrganizationOwnerChange> changes) {
        if (changes == null || changes.isEmpty()) return List.of();
        guard.requireHierarchyGuard(context, MasterDataHierarchyKey.ORGANIZATION);
        access.requireManager();
        Map<UUID, OrganizationOwnerAssignment> current = new HashMap<>();
        repository.assignments(ProfileContext.requireId(), organizationId).forEach(row -> current.put(row.userId(), row));
        Set<UUID> eligible = new HashSet<>();
        repository.eligibleUsers(ProfileContext.requireId()).forEach(option -> eligible.add(option.id()));
        Set<UUID> seen = new HashSet<>();
        for (var change : changes) {
            if (change == null || change.operation() == null || change.userId() == null || !seen.add(change.userId())) throw invalid("INVALID_OWNER_ASSIGNMENT");
            var row = current.get(change.userId());
            if (change.operation() == OrganizationOwnerChange.Operation.CREATE_OR_RESTORE) {
                if (!eligible.contains(change.userId())) throw invalid("OWNER_NOT_ELIGIBLE");
                if (change.assignmentId() != null || change.version() != null) throw invalid("INVALID_OWNER_ASSIGNMENT");
                if (row != null && "ACTIVE".equals(row.status())) throw invalid("DUPLICATE_OWNER_ASSIGNMENT");
            } else if (row == null || !"ACTIVE".equals(row.status()) || !row.id().equals(change.assignmentId())
                    || change.version() == null || change.version() != row.version()) {
                throw new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict", "Organization owner assignment changed");
            }
        }
        List<RevisionContentResult> results = new ArrayList<>();
        for (var change : changes.stream().sorted(Comparator.comparing(value -> value.userId().toString())).toList()) {
            var before = current.get(change.userId());
            boolean add = change.operation() == OrganizationOwnerChange.Operation.CREATE_OR_RESTORE;
            var after = before == null ? repository.insert(ProfileContext.requireId(), organizationId, change.userId(), user.getCurrentUserIdOrNull())
                    : repository.changeStatus(before, add ? "ACTIVE" : "DELETED", user.getCurrentUserIdOrNull());
            results.add(RevisionContentResult.completed(RevisionEntityType.ORGANIZATION_OWNER_ASSIGNMENT, after.id(),
                before == null ? RevisionOperationType.CREATE : add ? RevisionOperationType.RESTORE : RevisionOperationType.DELETE,
                before == null ? null : before.version(), before == null ? null : json.valueToTree(before), json.valueToTree(after), after.version(), json.valueToTree(Map.of("validated", true))));
        }
        return List.copyOf(results);
    }
    private UnprocessableEntityException invalid(String code) {
        return new UnprocessableEntityException(code, "organization.ownerAssignment.invalid", "Choose an eligible organization owner from the selected profile");
    }
}
