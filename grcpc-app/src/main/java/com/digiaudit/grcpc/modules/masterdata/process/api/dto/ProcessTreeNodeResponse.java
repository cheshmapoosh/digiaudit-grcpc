package com.digiaudit.grcpc.modules.masterdata.process.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ProcessTreeNodeResponse(
        UUID id,
        ProcessTreeNodeType nodeType,
        String code,
        String title,
        UUID parentTreeId,
        int sortOrder,
        MasterDataLifecycleStatus status,
        LocalDate validFrom,
        LocalDate validTo,
        long version,
        List<ProcessTreeNodeResponse> children
) {
    public ProcessTreeNodeResponse {
        children = children == null ? List.of() : List.copyOf(children);
    }
}
