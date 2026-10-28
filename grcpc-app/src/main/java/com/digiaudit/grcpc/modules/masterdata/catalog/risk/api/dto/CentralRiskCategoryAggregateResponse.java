package com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import java.util.List;
import java.util.UUID;

public record CentralRiskCategoryAggregateResponse(UUID entityId, UUID revisionId, long version,
    List<DocumentCommandResponse> finalizedDocuments, CentralRiskCategoryResponse entity) {}
