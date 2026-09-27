package com.digiaudit.grcpc.modules.masterdata.local.api;

import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalContextPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.local.application.LocalContextPolicyService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/local")
public class LocalContextPolicyController {
  private final LocalContextPolicyService service;
  public LocalContextPolicyController(LocalContextPolicyService service) { this.service = service; }

  @GetMapping("/organization-subprocess-scopes/{contextId}/policy-scopes")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalContextPolicyDtos.Page list(@PathVariable UUID contextId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam(required = false) MasterDataLifecycleStatus lifecycleStatus,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.list(contextId, organizationId, lifecycleStatus,
        page, size, sort, direction);
  }

  @GetMapping("/organization-subprocess-scopes/{contextId}/policy-scopes/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalContextPolicyDtos.Row detail(@PathVariable UUID contextId, @PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId) {
    return service.detail(contextId, id, organizationId);
  }

  @PostMapping("/organization-subprocess-scopes/{contextId}/policy-scopes")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalContextPolicyDtos.Mutation create(@PathVariable UUID contextId,
      @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalContextPolicyDtos.Create request) {
    return service.create(contextId, organizationId, request);
  }

  @PatchMapping("/organization-subprocess-scopes/{contextId}/policy-scopes/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalContextPolicyDtos.Mutation update(@PathVariable UUID contextId, @PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalContextPolicyDtos.Update request) {
    return service.update(contextId, id, organizationId, request);
  }

  @PostMapping("/organization-subprocess-scopes/{contextId}/policy-scopes/{id}/{action:activate|inactivate|delete|restore}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalContextPolicyDtos.Version lifecycle(@PathVariable UUID contextId, @PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId, @PathVariable String action,
      @Valid @RequestBody LocalContextPolicyDtos.Lifecycle request) {
    return service.lifecycle(contextId, id, organizationId, request.version(), action);
  }
}

