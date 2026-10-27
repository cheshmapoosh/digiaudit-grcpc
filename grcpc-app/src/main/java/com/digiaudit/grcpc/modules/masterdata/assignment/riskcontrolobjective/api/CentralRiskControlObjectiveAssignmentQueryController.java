package com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api;

import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.application.CentralRiskControlObjectiveAssignmentQueryService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@PreAuthorize("@masterDataAuthorization.canView('CONTROL') and @masterDataAuthorization.canView('RISK')")
public class CentralRiskControlObjectiveAssignmentQueryController {
  private final CentralRiskControlObjectiveAssignmentQueryService queries;
  public CentralRiskControlObjectiveAssignmentQueryController(CentralRiskControlObjectiveAssignmentQueryService queries) { this.queries = queries; }

  @GetMapping("/api/master-data/central/control-objectives/{id}/risk-assignments")
  public List<CentralRiskControlObjectiveAssignmentResponse> forControlObjective(@PathVariable UUID id) { return queries.forControlObjective(id, false); }

  @GetMapping("/api/master-data/central/control-objectives/{id}/risk-assignments/deleted")
  public List<CentralRiskControlObjectiveAssignmentResponse> deletedForControlObjective(@PathVariable UUID id) { return queries.forControlObjective(id, true); }

  @GetMapping("/api/master-data/central/risk-templates/{id}/control-objective-assignments")
  public List<CentralRiskControlObjectiveAssignmentResponse> forRiskTemplate(@PathVariable UUID id) { return queries.forRiskTemplate(id); }

  @GetMapping("/api/master-data/central/risk-control-objective-assignment/options")
  public CentralRiskControlObjectiveAssignmentOptionsResponse options() { return queries.options(); }
}
