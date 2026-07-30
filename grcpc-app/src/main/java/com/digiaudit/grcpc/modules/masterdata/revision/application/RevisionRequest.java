package com.digiaudit.grcpc.modules.masterdata.revision.application;

import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionDomain;

import java.util.Objects;
import java.util.UUID;

public record RevisionRequest(
        RevisionDomain domain,
        UUID organizationId,
        String title,
        String description,
        UUID causedByRevisionId
) {
    public RevisionRequest {
        Objects.requireNonNull(domain, "domain is required");
        title = requireText(title);
        if (domain == RevisionDomain.CENTRAL && organizationId != null) {
            throw new IllegalArgumentException("Central revision requests must not have an organizationId");
        }
        if (domain == RevisionDomain.LOCAL && organizationId == null) {
            throw new IllegalArgumentException("Local revision requests require exactly one organizationId");
        }
    }

    public static RevisionRequest central(String title, String description, UUID causedByRevisionId) {
        return new RevisionRequest(RevisionDomain.CENTRAL, null, title, description, causedByRevisionId);
    }

    public static RevisionRequest local(UUID organizationId, String title, String description, UUID causedByRevisionId) {
        return new RevisionRequest(RevisionDomain.LOCAL, organizationId, title, description, causedByRevisionId);
    }

    private static String requireText(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("title is required");
        }
        return value;
    }
}
