package com.digiaudit.grcpc.modules.organization.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.organization.domain.OrganizationType;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record OrganizationTreeNodeResponse(
        UUID id,
        String code,
        String name,
        OrganizationType organizationType,
        UUID parentOrganizationId,
        String displayLabel,
        MasterDataLifecycleStatus status,
        LocalDate validFrom,
        LocalDate validTo,
        long version,
        List<OrganizationTreeNodeResponse> children
) {
    public OrganizationTreeNodeResponse {
        children = children == null ? List.of() : List.copyOf(children);
    }
}
