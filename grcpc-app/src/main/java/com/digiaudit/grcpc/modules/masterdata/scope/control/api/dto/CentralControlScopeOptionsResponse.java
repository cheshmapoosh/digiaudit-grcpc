package com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto;

import java.util.List;

public record CentralControlScopeOptionsResponse(
    List<String> recommendedFrequencyCodes,
    List<String> recommendedExecutionMethodCodes,
    List<String> recommendedTestMethodCodes) {
  public CentralControlScopeOptionsResponse {
    recommendedFrequencyCodes = List.copyOf(recommendedFrequencyCodes);
    recommendedExecutionMethodCodes = List.copyOf(recommendedExecutionMethodCodes);
    recommendedTestMethodCodes = List.copyOf(recommendedTestMethodCodes);
  }
}
