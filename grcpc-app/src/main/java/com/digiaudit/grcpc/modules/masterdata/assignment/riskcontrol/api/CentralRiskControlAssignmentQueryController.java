package com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.api;

import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.application.CentralRiskControlAssignmentQueryService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@PreAuthorize("@masterDataAuthorization.canView('CONTROL') and @masterDataAuthorization.canView('RISK')")
public class CentralRiskControlAssignmentQueryController {
  private final CentralRiskControlAssignmentQueryService queries;
  public CentralRiskControlAssignmentQueryController(CentralRiskControlAssignmentQueryService queries) { this.queries = queries; }

  @GetMapping("/api/master-data/central/controls/{id}/risk-assignments")
  public List<CentralRiskControlAssignmentResponse> forControl(@PathVariable UUID id) { return queries.forControl(id, false); }

  @GetMapping("/api/master-data/central/controls/{id}/risk-assignments/deleted")
  public List<CentralRiskControlAssignmentResponse> deletedForControl(@PathVariable UUID id) { return queries.forControl(id, true); }

  @GetMapping("/api/master-data/central/risk-templates/{id}/control-assignments")
  public List<CentralRiskControlAssignmentResponse> forRiskTemplate(@PathVariable UUID id) { return queries.forRiskTemplate(id); }

  @GetMapping("/api/master-data/central/risk-control-assignment/options")
  public CentralRiskControlAssignmentOptionsResponse options() { return queries.options(); }
}
