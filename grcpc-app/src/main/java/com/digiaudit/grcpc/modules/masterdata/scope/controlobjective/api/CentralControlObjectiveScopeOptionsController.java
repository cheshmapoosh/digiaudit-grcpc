package com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api;

import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.application.CentralControlObjectiveQueryService;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.dto.CentralControlObjectiveScopeSelectionOptionsResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/master-data/central/control-objective-scope")
public class CentralControlObjectiveScopeOptionsController {
  private final CentralControlObjectiveQueryService objectives;

  public CentralControlObjectiveScopeOptionsController(CentralControlObjectiveQueryService objectives) {
    this.objectives = objectives;
  }

  @GetMapping("/options")
  @PreAuthorize("@masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public CentralControlObjectiveScopeSelectionOptionsResponse options() {
    return new CentralControlObjectiveScopeSelectionOptionsResponse(objectives.list());
  }
}
