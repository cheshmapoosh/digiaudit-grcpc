package com.digiaudit.grcpc.modules.masterdata.scope.control.api;

import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.CentralControlScopeOptionsResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.control.application.CentralSubprocessControlScopeAggregateService;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CentralControlSummaryResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.application.CentralControlQueryService;
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

  public CentralControlScopeOptionsController(
      CentralSubprocessControlScopeAggregateService scopes,
      CentralControlQueryService controls) {
    this.scopes = scopes;
    this.controls = controls;
  }

  @GetMapping("/options")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_SCOPE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public CentralControlScopeOptionsResponse options() {
    return new CentralControlScopeOptionsResponse(
        scopes.frequencyCodes(), scopes.executionMethodCodes(), scopes.testMethodCodes());
  }

  @GetMapping("/eligible-controls")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_SCOPE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public List<CentralControlSummaryResponse> eligibleControls() {
    return controls.list();
  }
}
