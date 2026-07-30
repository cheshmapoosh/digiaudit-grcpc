package com.digiaudit.grcpc.modules.masterdata.revision.application;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionDomain;
import com.digiaudit.grcpc.modules.masterdata.revision.exception.MasterDataRevisionRequiredException;
import com.digiaudit.grcpc.modules.masterdata.revision.exception.RevisionDomainMismatchException;

import java.util.Collection;
import java.util.Objects;
import java.util.UUID;

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

    public void requireContentEntityType(RevisionExecutionContext context, RevisionContentDraft contentDraft) {
        RevisionExecutionContext verifiedContext = requireContext(context);
        Objects.requireNonNull(contentDraft, "contentDraft is required");
        if (!contentDraft.entityType().isPermittedIn(verifiedContext.domain())) {
            throw RevisionDomainMismatchException.contentNotPermitted(contentDraft.entityType(), verifiedContext.domain());
        }
    }

    public void requireMutationAllowed(
            RevisionExecutionContext context,
            RevisionDomain expectedDomain,
            UUID expectedOrganizationId,
            Collection<RevisionContentDraft> contentDrafts
    ) {
        requireContext(context);
        requireDomain(context, expectedDomain);
        requireOrganization(context, expectedOrganizationId);
        requireDraft(context);
        Objects.requireNonNull(contentDrafts, "contentDrafts is required");
        contentDrafts.forEach(contentDraft -> requireContentEntityType(context, contentDraft));
    }
}
