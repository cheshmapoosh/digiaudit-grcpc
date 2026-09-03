package com.digiaudit.grcpc.modules.masterdata.scope.control.api;

import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.CentralSubprocessControlScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.control.application.CentralSubprocessControlScopeQueryService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/master-data/central/subprocesses/{subprocessId}/control-scopes")
public class CentralSubprocessControlScopeController {
  private final CentralSubprocessControlScopeQueryService queries;

  public CentralSubprocessControlScopeController(
      CentralSubprocessControlScopeQueryService queries) {
    this.queries = queries;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_SCOPE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public List<CentralSubprocessControlScopeResponse> list(
      @PathVariable UUID subprocessId,
      @RequestParam(required = false) MasterDataLifecycleStatus status,
      @RequestParam(required = false) String search) {
    return queries.listForSubprocess(subprocessId, status, search);
  }

  @GetMapping("/{scopeId}")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_SCOPE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public CentralSubprocessControlScopeResponse detail(
      @PathVariable UUID subprocessId, @PathVariable UUID scopeId) {
    return queries.detail(subprocessId, scopeId);
  }

}
