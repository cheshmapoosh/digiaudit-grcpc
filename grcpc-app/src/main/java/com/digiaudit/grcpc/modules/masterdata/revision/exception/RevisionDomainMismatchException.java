package com.digiaudit.grcpc.modules.masterdata.revision.exception;

import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionDomain;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionEntityType;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataErrorCode;

import java.util.UUID;

public final class RevisionDomainMismatchException extends UnprocessableEntityException {
    private RevisionDomainMismatchException(String developerMessage, Object... messageArgs) {
        super(
                MasterDataErrorCode.REVISION_DOMAIN_MISMATCH.code(),
                "error.masterdata.v2.revisionDomainMismatch",
                developerMessage,
                messageArgs
        );
    }

    public static RevisionDomainMismatchException domainMismatch(RevisionDomain expected, RevisionDomain actual) {
        return new RevisionDomainMismatchException(
                "Revision domain mismatch. expected=" + expected + ", actual=" + actual,
                expected,
                actual
        );
    }

    public static RevisionDomainMismatchException organizationMismatch(UUID expectedOrganizationId, UUID actualOrganizationId) {
        return new RevisionDomainMismatchException(
                "Revision organization mismatch. expected=" + expectedOrganizationId + ", actual=" + actualOrganizationId,
                expectedOrganizationId,
                actualOrganizationId
        );
    }

    public static RevisionDomainMismatchException centralOrganizationProvided(UUID organizationId) {
        return new RevisionDomainMismatchException(
                "Central mutation must not be tied to an organization: " + organizationId,
                organizationId
        );
    }

    public static RevisionDomainMismatchException contentNotPermitted(RevisionEntityType entityType, RevisionDomain revisionDomain) {
        return new RevisionDomainMismatchException(
                "Revision entity type " + entityType.wireValue() + " is not permitted in " + revisionDomain + " revision",
                entityType.wireValue(),
                revisionDomain
        );
    }
}
