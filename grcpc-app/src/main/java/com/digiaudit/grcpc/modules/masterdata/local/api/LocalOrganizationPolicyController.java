package com.digiaudit.grcpc.modules.masterdata.local.api;

import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalOrganizationPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.local.application.LocalOrganizationPolicyService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/local")
public class LocalOrganizationPolicyController {
  private final LocalOrganizationPolicyService service;
  public LocalOrganizationPolicyController(LocalOrganizationPolicyService service) { this.service = service; }

  @GetMapping("/organization-policy-scopes")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalOrganizationPolicyDtos.Page list(@RequestParam UUID organizationId,
      @RequestParam(required = false) MasterDataLifecycleStatus lifecycleStatus,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.list(organizationId, lifecycleStatus,
        page, size, sort, direction);
  }

  @GetMapping("/organization-policy-scopes/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalOrganizationPolicyDtos.Row detail(@PathVariable UUID id, @RequestParam(required = false) UUID organizationId) {
    return service.detail(id, organizationId);
  }

  @PostMapping("/organization-policy-scopes")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalOrganizationPolicyDtos.Mutation create(@Valid @RequestBody LocalOrganizationPolicyDtos.Create request) {
    return service.create(request);
  }

  @PatchMapping("/organization-policy-scopes/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalOrganizationPolicyDtos.Mutation update(@PathVariable UUID id, @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalOrganizationPolicyDtos.Update request) {
    return service.update(id, organizationId, request);
  }

  @PostMapping("/organization-policy-scopes/{id}/{action:activate|inactivate|delete|restore}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalOrganizationPolicyDtos.Version lifecycle(@PathVariable UUID id, @RequestParam(required = false) UUID organizationId, @PathVariable String action,
      @Valid @RequestBody LocalOrganizationPolicyDtos.Lifecycle request) {
    return service.lifecycle(id, organizationId, request.version(), action);
  }
}

