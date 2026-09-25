package com.digiaudit.grcpc.modules.masterdata.coverage.requirementcontrol.api.dto;

import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.CentralSubprocessControlScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.api.dto.CentralSubprocessRequirementScopeResponse;
import java.util.List;

public record CentralRequirementControlCoverageOptionsResponse(
    List<CentralSubprocessRequirementScopeResponse> requirementScopes,
    List<CentralSubprocessControlScopeResponse> controlScopes) {
  public CentralRequirementControlCoverageOptionsResponse {
    requirementScopes = requirementScopes == null ? List.of() : List.copyOf(requirementScopes);
    controlScopes = controlScopes == null ? List.of() : List.copyOf(controlScopes);
  }
}
