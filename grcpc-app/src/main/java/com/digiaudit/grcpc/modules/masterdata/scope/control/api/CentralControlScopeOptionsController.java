package com.digiaudit.grcpc.modules.masterdata.scope.control.api;

import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.CentralControlScopeOptionsResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.control.application.CentralSubprocessControlScopeAggregateService;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CentralControlSummaryResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.application.CentralControlQueryService;
import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.ProcessControlTreeNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.control.application.CentralSubprocessControlScopeQueryService;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/master-data/central/control-scope")
public class CentralControlScopeOptionsController {
  private final CentralSubprocessControlScopeAggregateService scopes;
  private final CentralControlQueryService controls;
  private final CentralSubprocessControlScopeQueryService queries;

  public CentralControlScopeOptionsController(
      CentralSubprocessControlScopeAggregateService scopes,
      CentralControlQueryService controls,
      CentralSubprocessControlScopeQueryService queries) {
    this.scopes = scopes;
    this.controls = controls;
    this.queries = queries;
  }

  @GetMapping("/process-tree")
  @PreAuthorize("@masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public List<ProcessControlTreeNodeResponse> processTree() {
    return queries.listForProcessTree();
  }

  @GetMapping("/options")
  @PreAuthorize("@masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public CentralControlScopeOptionsResponse options() {
    return new CentralControlScopeOptionsResponse(
        scopes.frequencyCodes(), scopes.executionMethodCodes(), scopes.testMethodCodes());
  }

  @GetMapping("/eligible-controls")
  @PreAuthorize("@masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public List<CentralControlSummaryResponse> eligibleControls() {
    return controls.list();
  }
}
