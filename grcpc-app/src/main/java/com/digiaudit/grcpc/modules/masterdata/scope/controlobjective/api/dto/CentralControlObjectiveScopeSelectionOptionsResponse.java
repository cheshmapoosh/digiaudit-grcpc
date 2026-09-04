package com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.dto;

import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.api.dto.CentralControlObjectiveSummaryResponse;
import java.util.List;

public record CentralControlObjectiveScopeSelectionOptionsResponse(
    List<CentralControlObjectiveSummaryResponse> controlObjectives) {
  public CentralControlObjectiveScopeSelectionOptionsResponse {
    controlObjectives = controlObjectives == null ? List.of() : List.copyOf(controlObjectives);
  }
}
