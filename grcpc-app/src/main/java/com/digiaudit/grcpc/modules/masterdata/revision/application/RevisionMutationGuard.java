package com.digiaudit.grcpc.modules.masterdata.revision.application;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionContentResult;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionDomain;
import com.digiaudit.grcpc.modules.masterdata.revision.exception.MasterDataRevisionRequiredException;
import com.digiaudit.grcpc.modules.masterdata.revision.exception.RevisionDomainMismatchException;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataHierarchyKey;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Objects;
import java.util.UUID;

@Component
public final class RevisionMutationGuard {
    public RevisionExecutionContext requireContext(RevisionExecutionContext context) {
        if (context == null) {
            throw MasterDataRevisionRequiredException.missing();
        }
        return context;
    }

    public void requireDomain(RevisionExecutionContext context, RevisionDomain expectedDomain) {
        RevisionExecutionContext verifiedContext = requireContext(context);
        Objects.requireNonNull(expectedDomain, "expectedDomain is required");
        if (verifiedContext.domain() != expectedDomain) {
            throw RevisionDomainMismatchException.domainMismatch(expectedDomain, verifiedContext.domain());
        }
    }

    public void requireOrganization(RevisionExecutionContext context, UUID expectedOrganizationId) {
        RevisionExecutionContext verifiedContext = requireContext(context);
        if (verifiedContext.domain() == RevisionDomain.CENTRAL) {
            if (expectedOrganizationId != null) {
                throw RevisionDomainMismatchException.centralOrganizationProvided(expectedOrganizationId);
            }
            return;
        }
        if (expectedOrganizationId == null || !expectedOrganizationId.equals(verifiedContext.organizationId())) {
            throw RevisionDomainMismatchException.organizationMismatch(expectedOrganizationId, verifiedContext.organizationId());
        }
    }

    public void requireDraft(RevisionExecutionContext context) {
        RevisionExecutionContext verifiedContext = requireContext(context);
        if (!verifiedContext.isDraft()) {
            throw MasterDataRevisionRequiredException.notDraft(verifiedContext.revisionId());
        }
    }

    public void requireHierarchyGuard(
            RevisionExecutionContext context,
            MasterDataHierarchyKey expectedKey
    ) {
        RevisionExecutionContext verifiedContext = requireContext(context);
        Objects.requireNonNull(expectedKey, "expectedKey is required");
        if (verifiedContext.acquiredHierarchyKey() == null) {
            throw MasterDataRevisionRequiredException.hierarchyGuardMissing();
        }
        if (verifiedContext.acquiredHierarchyKey() != expectedKey) {
            throw MasterDataRevisionRequiredException.hierarchyGuardMismatch();
        }
    }

    public void requireContentEntityType(RevisionExecutionContext context, RevisionContentResult contentResult) {
        RevisionExecutionContext verifiedContext = requireContext(context);
        Objects.requireNonNull(contentResult, "contentResult is required");
        if (!contentResult.entityType().isPermittedIn(verifiedContext.domain())) {
            throw RevisionDomainMismatchException.contentNotPermitted(contentResult.entityType(), verifiedContext.domain());
        }
    }

    public void requireMutationAllowed(
            RevisionExecutionContext context,
            RevisionDomain expectedDomain,
            UUID expectedOrganizationId,
            Collection<RevisionContentResult> contentResults
    ) {
        requireContext(context);
        requireDomain(context, expectedDomain);
        requireOrganization(context, expectedOrganizationId);
        requireDraft(context);
        Objects.requireNonNull(contentResults, "contentResults is required");
        contentResults.forEach(contentResult -> requireContentEntityType(context, contentResult));
    }
}
