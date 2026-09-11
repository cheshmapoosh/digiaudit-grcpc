package com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api;

import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto.CentralControlObjectiveAccountGroupOptionsResponse;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto.CentralControlObjectiveAccountGroupResponse;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.application.CentralControlObjectiveAccountGroupQueryService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CentralControlObjectiveAccountGroupQueryController {
  private final CentralControlObjectiveAccountGroupQueryService queries;

  public CentralControlObjectiveAccountGroupQueryController(
      CentralControlObjectiveAccountGroupQueryService queries) {
    this.queries = queries;
  }

  @GetMapping("/api/master-data/central/control-objectives/{controlObjectiveId}/account-groups")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_OBJECTIVE_ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public List<CentralControlObjectiveAccountGroupResponse> forControlObjective(
      @PathVariable UUID controlObjectiveId) {
    return queries.forControlObjective(controlObjectiveId, false);
  }

  @GetMapping("/api/master-data/central/control-objectives/{controlObjectiveId}/account-groups/deleted")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_OBJECTIVE_ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public List<CentralControlObjectiveAccountGroupResponse> deletedForControlObjective(
      @PathVariable UUID controlObjectiveId) {
    return queries.forControlObjective(controlObjectiveId, true);
  }

  @GetMapping("/api/master-data/central/account-groups/{accountGroupId}/control-objectives")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_OBJECTIVE_ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public List<CentralControlObjectiveAccountGroupResponse> forAccountGroup(
      @PathVariable UUID accountGroupId) {
    return queries.forAccountGroup(accountGroupId);
  }

  @GetMapping("/api/master-data/central/control-objective-account-group-options")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_OBJECTIVE_ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public CentralControlObjectiveAccountGroupOptionsResponse options() {
    return queries.options();
  }
}
