package com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto;

import com.digiaudit.grcpc.modules.document.api.dto.DocumentCommandResponse;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.api.dto.CentralRiskControlAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api.dto.CentralRiskControlObjectiveAssignmentResponse;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.UUID;

public record CentralRiskTemplateAggregateResponse(UUID entityId, UUID revisionId, long version,
    List<DocumentCommandResponse> finalizedDocuments, CentralRiskTemplateResponse entity,
    @JsonInclude(JsonInclude.Include.NON_NULL) List<CentralRiskControlAssignmentResponse> controlAssignments,
    @JsonInclude(JsonInclude.Include.NON_NULL) List<CentralRiskControlObjectiveAssignmentResponse> controlObjectiveAssignments) {}
