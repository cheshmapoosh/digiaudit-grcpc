package com.digiaudit.grcpc.modules.masterdata.scope.risk.api.dto;

import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.CentralRiskCategorySummaryResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.CentralRiskTemplateSummaryResponse;
import java.util.List;

public record CentralRiskScopeSelectionOptionsResponse(
    List<CentralRiskTemplateSummaryResponse> riskTemplates,
    List<CentralRiskCategorySummaryResponse> riskCategories) {
  public CentralRiskScopeSelectionOptionsResponse {
    riskTemplates = riskTemplates == null ? List.of() : List.copyOf(riskTemplates);
    riskCategories = riskCategories == null ? List.of() : List.copyOf(riskCategories);
  }
}
