package com.digiaudit.grcpc.modules.masterdata.scope.requirement.api;

import com.digiaudit.grcpc.modules.masterdata.scope.requirement.api.dto.CentralSubprocessRequirementScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.application.CentralSubprocessRequirementScopeQueryService;
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
@RequestMapping("/api/master-data/central/regulation-requirements/{requirementId}/subprocess-scopes")
public class CentralRequirementSubprocessScopeQueryController {
  private final CentralSubprocessRequirementScopeQueryService queries;

  public CentralRequirementSubprocessScopeQueryController(
      CentralSubprocessRequirementScopeQueryService queries) { this.queries = queries; }

  @GetMapping
  @PreAuthorize("hasAuthority('CENTRAL_REQUIREMENT_SCOPE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public List<CentralSubprocessRequirementScopeResponse> list(
      @PathVariable UUID requirementId,
      @RequestParam(required = false) MasterDataLifecycleStatus status,
      @RequestParam(required = false) String search) {
    return queries.listForRequirement(requirementId, status, search);
  }
}
