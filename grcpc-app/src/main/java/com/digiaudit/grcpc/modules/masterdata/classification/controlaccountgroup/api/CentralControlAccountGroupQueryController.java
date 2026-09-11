package com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api;

import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.application.CentralControlAccountGroupQueryService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
public class CentralControlAccountGroupQueryController {
  private final CentralControlAccountGroupQueryService queries;
  public CentralControlAccountGroupQueryController(CentralControlAccountGroupQueryService queries) { this.queries = queries; }

  @GetMapping("/api/master-data/central/controls/{controlId}/account-groups")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public List<CentralControlAccountGroupResponse> forControl(@PathVariable UUID controlId) { return queries.forControl(controlId, false); }

  @GetMapping("/api/master-data/central/controls/{controlId}/account-groups/deleted")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public List<CentralControlAccountGroupResponse> deletedForControl(@PathVariable UUID controlId) { return queries.forControl(controlId, true); }

  @GetMapping("/api/master-data/central/account-groups/{accountGroupId}/controls")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public List<CentralControlAccountGroupResponse> forAccountGroup(@PathVariable UUID accountGroupId) { return queries.forAccountGroup(accountGroupId); }

  @GetMapping("/api/master-data/central/control-account-group-options")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public CentralControlAccountGroupOptionsResponse options() { return queries.options(); }

  @GetMapping("/api/master-data/central/subprocesses/{subprocessId}/account-groups")
  @PreAuthorize("(hasAuthority('PROCESS_VIEW') and ((hasAuthority('CENTRAL_CONTROL_SCOPE_VIEW') and hasAuthority('CENTRAL_CONTROL_ACCOUNT_GROUP_VIEW')) or (hasAuthority('CENTRAL_CONTROL_OBJECTIVE_SCOPE_VIEW') and hasAuthority('CENTRAL_CONTROL_OBJECTIVE_ACCOUNT_GROUP_VIEW')))) or hasAuthority('ROLE_ROOT_ADMIN')")
  public List<DerivedSubprocessAccountGroupResponse> forSubprocess(@PathVariable UUID subprocessId) { return queries.forSubprocess(subprocessId); }
}
