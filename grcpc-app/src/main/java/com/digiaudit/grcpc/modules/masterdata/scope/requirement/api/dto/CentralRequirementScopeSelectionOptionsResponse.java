package com.digiaudit.grcpc.modules.masterdata.scope.requirement.api.dto;

import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.CentralRegulationDtos;
import java.util.List;

public record CentralRequirementScopeSelectionOptionsResponse(
    List<CentralRegulationDtos.GroupSummary> regulationGroups,
    List<CentralRegulationDtos.RegulationSummary> regulations,
    List<CentralRegulationDtos.RequirementSummary> requirements) {
  public CentralRequirementScopeSelectionOptionsResponse {
    regulationGroups = regulationGroups == null ? List.of() : List.copyOf(regulationGroups);
    regulations = regulations == null ? List.of() : List.copyOf(regulations);
    requirements = requirements == null ? List.of() : List.copyOf(requirements);
  }
}
