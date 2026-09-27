package com.digiaudit.grcpc.modules.masterdata.local.api;

import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalControlPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.local.application.LocalControlPolicyService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/local")
public class LocalControlPolicyController {
  private final LocalControlPolicyService service;
  public LocalControlPolicyController(LocalControlPolicyService service) { this.service = service; }

  @GetMapping("/control-scopes/{localControlScopeId}/policy-scopes")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalControlPolicyDtos.Page list(@PathVariable UUID localControlScopeId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam(required = false) MasterDataLifecycleStatus lifecycleStatus,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.list(localControlScopeId, organizationId, lifecycleStatus,
        page, size, sort, direction);
  }

  @GetMapping("/control-scopes/{localControlScopeId}/policy-scopes/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalControlPolicyDtos.Row detail(@PathVariable UUID localControlScopeId, @PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId) {
    return service.detail(localControlScopeId, id, organizationId);
  }

  @PostMapping("/control-scopes/{localControlScopeId}/policy-scopes")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalControlPolicyDtos.Mutation create(@PathVariable UUID localControlScopeId,
      @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalControlPolicyDtos.Create request) {
    return service.create(localControlScopeId, organizationId, request);
  }

  @PatchMapping("/control-scopes/{localControlScopeId}/policy-scopes/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalControlPolicyDtos.Mutation update(@PathVariable UUID localControlScopeId, @PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalControlPolicyDtos.Update request) {
    return service.update(localControlScopeId, id, organizationId, request);
  }

  @PostMapping("/control-scopes/{localControlScopeId}/policy-scopes/{id}/{action:activate|inactivate|delete|restore}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalControlPolicyDtos.Version lifecycle(@PathVariable UUID localControlScopeId, @PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId, @PathVariable String action,
      @Valid @RequestBody LocalControlPolicyDtos.Lifecycle request) {
    return service.lifecycle(localControlScopeId, id, organizationId, request.version(), action);
  }
}

