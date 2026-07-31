package com.digiaudit.grcpc.modules.document.domain;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionDomain;

import java.util.Objects;
import java.util.UUID;

public record DocumentTargetContext(
        DocumentLinkTargetType targetType,
        UUID targetId,
        RevisionDomain revisionDomain,
        UUID organizationId,
        String authorizationResourceType,
        UUID authorizationResourceId
) {
    public DocumentTargetContext {
        Objects.requireNonNull(targetType, "targetType is required");
        Objects.requireNonNull(targetId, "targetId is required");
        Objects.requireNonNull(revisionDomain, "revisionDomain is required");
        Objects.requireNonNull(authorizationResourceType, "authorizationResourceType is required");
        Objects.requireNonNull(authorizationResourceId, "authorizationResourceId is required");
        if (revisionDomain == RevisionDomain.CENTRAL && organizationId != null) {
            throw new IllegalArgumentException("Central document target context must not have an organizationId");
        }
        if (revisionDomain == RevisionDomain.LOCAL && organizationId == null) {
            throw new IllegalArgumentException("Local document target context requires an organizationId");
        }
    }

    public boolean matchesRevision(RevisionDomain domain, UUID revisionOrganizationId) {
        if (revisionDomain != domain) {
            return false;
        }
        return revisionDomain == RevisionDomain.CENTRAL
                || Objects.equals(organizationId, revisionOrganizationId);
    }
}
