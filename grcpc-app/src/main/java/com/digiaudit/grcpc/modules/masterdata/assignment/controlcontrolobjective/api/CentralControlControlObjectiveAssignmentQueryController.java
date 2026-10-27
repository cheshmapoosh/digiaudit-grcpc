package com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.api;

import com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.application.CentralControlControlObjectiveAssignmentQueryService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@PreAuthorize("@masterDataAuthorization.canView('CONTROL')")
public class CentralControlControlObjectiveAssignmentQueryController {
  private final CentralControlControlObjectiveAssignmentQueryService queries;
  public CentralControlControlObjectiveAssignmentQueryController(CentralControlControlObjectiveAssignmentQueryService queries) { this.queries = queries; }

  @GetMapping("/api/master-data/central/controls/{id}/control-objective-assignments")
  public List<CentralControlControlObjectiveAssignmentResponse> forControl(@PathVariable UUID id) { return queries.forControl(id, false); }

  @GetMapping("/api/master-data/central/controls/{id}/control-objective-assignments/deleted")
  public List<CentralControlControlObjectiveAssignmentResponse> deletedForControl(@PathVariable UUID id) { return queries.forControl(id, true); }

  @GetMapping("/api/master-data/central/control-objectives/{id}/control-assignments")
  public List<CentralControlControlObjectiveAssignmentResponse> forControlObjective(@PathVariable UUID id) { return queries.forControlObjective(id); }

  @GetMapping("/api/master-data/central/control-control-objective-assignment/options")
  public CentralControlControlObjectiveAssignmentOptionsResponse options() { return queries.options(); }
}
