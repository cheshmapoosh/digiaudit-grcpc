package com.digiaudit.grcpc.modules.masterdata.scope.requirement.api;

import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.application.CentralRegulationQueryService;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.api.dto.CentralRequirementScopeSelectionOptionsResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/master-data/central/requirement-scope")
public class CentralRequirementScopeOptionsController {
  private final CentralRegulationQueryService regulations;

  public CentralRequirementScopeOptionsController(CentralRegulationQueryService regulations) {
    this.regulations = regulations;
  }

  @GetMapping("/options")
  @PreAuthorize("@masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public CentralRequirementScopeSelectionOptionsResponse options() {
    return new CentralRequirementScopeSelectionOptionsResponse(
        regulations.groups(), regulations.regulations(null), regulations.requirements(null));
  }
}
