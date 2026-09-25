package com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.api.dto;

import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.dto.CentralSubprocessControlObjectiveScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.api.dto.CentralSubprocessRiskScopeResponse;
import java.util.List;

public record CentralRiskControlObjectiveCoverageOptionsResponse(
    List<CentralSubprocessRiskScopeResponse> riskScopes,
    List<CentralSubprocessControlObjectiveScopeResponse> controlObjectiveScopes) {
  public CentralRiskControlObjectiveCoverageOptionsResponse {
    riskScopes = riskScopes == null ? List.of() : List.copyOf(riskScopes);
    controlObjectiveScopes = controlObjectiveScopes == null ? List.of() : List.copyOf(controlObjectiveScopes);
  }
}
