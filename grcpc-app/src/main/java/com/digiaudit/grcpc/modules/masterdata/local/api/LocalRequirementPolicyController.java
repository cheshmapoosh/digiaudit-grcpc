package com.digiaudit.grcpc.modules.masterdata.local.api;

import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalRequirementPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.local.application.LocalRequirementPolicyService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/local")
public class LocalRequirementPolicyController {
  private final LocalRequirementPolicyService service;
  public LocalRequirementPolicyController(LocalRequirementPolicyService service) { this.service = service; }

  @GetMapping("/requirement-scopes/{localRequirementScopeId}/policy-scopes")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalRequirementPolicyDtos.Page list(@PathVariable UUID localRequirementScopeId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam(required = false) MasterDataLifecycleStatus lifecycleStatus,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.list(localRequirementScopeId, organizationId, lifecycleStatus,
        page, size, sort, direction);
  }

  @GetMapping("/requirement-scopes/{localRequirementScopeId}/policy-scopes/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalRequirementPolicyDtos.Row detail(@PathVariable UUID localRequirementScopeId, @PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId) {
    return service.detail(localRequirementScopeId, id, organizationId);
  }

  @PostMapping("/requirement-scopes/{localRequirementScopeId}/policy-scopes")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalRequirementPolicyDtos.Mutation create(@PathVariable UUID localRequirementScopeId,
      @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalRequirementPolicyDtos.Create request) {
    return service.create(localRequirementScopeId, organizationId, request);
  }

  @PatchMapping("/requirement-scopes/{localRequirementScopeId}/policy-scopes/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalRequirementPolicyDtos.Mutation update(@PathVariable UUID localRequirementScopeId, @PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalRequirementPolicyDtos.Update request) {
    return service.update(localRequirementScopeId, id, organizationId, request);
  }

  @PostMapping("/requirement-scopes/{localRequirementScopeId}/policy-scopes/{id}/{action:activate|inactivate|delete|restore}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalRequirementPolicyDtos.Version lifecycle(@PathVariable UUID localRequirementScopeId, @PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId, @PathVariable String action,
      @Valid @RequestBody LocalRequirementPolicyDtos.Lifecycle request) {
    return service.lifecycle(localRequirementScopeId, id, organizationId, request.version(), action);
  }
}

