package com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.api;

import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.application.CentralRequirementControlAssignmentQueryService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@PreAuthorize("@masterDataAuthorization.canView('CONTROL') and @masterDataAuthorization.canView('GOVERNANCE')")
public class CentralRequirementControlAssignmentQueryController {
  private final CentralRequirementControlAssignmentQueryService queries;
  public CentralRequirementControlAssignmentQueryController(CentralRequirementControlAssignmentQueryService queries) { this.queries = queries; }

  @GetMapping("/api/master-data/central/controls/{id}/requirement-assignments")
  public List<CentralRequirementControlAssignmentResponse> forControl(@PathVariable UUID id) { return queries.forControl(id, false); }

  @GetMapping("/api/master-data/central/controls/{id}/requirement-assignments/deleted")
  public List<CentralRequirementControlAssignmentResponse> deletedForControl(@PathVariable UUID id) { return queries.forControl(id, true); }

  @GetMapping("/api/master-data/central/regulation-requirements/{id}/control-assignments")
  public List<CentralRequirementControlAssignmentResponse> forRequirement(@PathVariable UUID id) { return queries.forRequirement(id); }

  @GetMapping("/api/master-data/central/requirement-control-assignment/options")
  public CentralRequirementControlAssignmentOptionsResponse options() { return queries.options(); }
}
