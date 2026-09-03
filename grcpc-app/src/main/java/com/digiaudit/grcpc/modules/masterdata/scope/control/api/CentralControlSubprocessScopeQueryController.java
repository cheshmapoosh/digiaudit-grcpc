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
@RequestMapping("/api/master-data/central/controls/{controlId}/subprocess-scopes")
public class CentralControlSubprocessScopeQueryController {
  private final CentralSubprocessControlScopeQueryService queries;

  public CentralControlSubprocessScopeQueryController(
      CentralSubprocessControlScopeQueryService queries) {
    this.queries = queries;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_SCOPE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public List<CentralSubprocessControlScopeResponse> list(
      @PathVariable UUID controlId,
      @RequestParam(required = false) MasterDataLifecycleStatus status,
      @RequestParam(required = false) String search) {
    return queries.listForControl(controlId, status, search);
  }
}
