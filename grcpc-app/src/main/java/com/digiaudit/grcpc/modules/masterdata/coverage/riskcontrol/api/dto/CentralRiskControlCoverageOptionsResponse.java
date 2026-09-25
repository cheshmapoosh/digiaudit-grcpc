package com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.api.dto;

import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.CentralSubprocessControlScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.api.dto.CentralSubprocessRiskScopeResponse;
import java.util.List;

public record CentralRiskControlCoverageOptionsResponse(
    List<CentralSubprocessRiskScopeResponse> riskScopes,
    List<CentralSubprocessControlScopeResponse> controlScopes) {
  public CentralRiskControlCoverageOptionsResponse {
    riskScopes = riskScopes == null ? List.of() : List.copyOf(riskScopes);
    controlScopes = controlScopes == null ? List.of() : List.copyOf(controlScopes);
  }
}
