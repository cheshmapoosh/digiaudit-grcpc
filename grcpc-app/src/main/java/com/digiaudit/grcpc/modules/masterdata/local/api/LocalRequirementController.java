package com.digiaudit.grcpc.modules.masterdata.local.api;

import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalRequirementDtos;
import com.digiaudit.grcpc.modules.masterdata.local.application.LocalRequirementService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/local/organization-subprocess-scopes/{contextId}/requirement-scopes")
public class LocalRequirementController {
  private final LocalRequirementService service;
  public LocalRequirementController(LocalRequirementService service) { this.service = service; }

  @GetMapping
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalRequirementDtos.Page list(@PathVariable UUID contextId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam(required = false) MasterDataLifecycleStatus lifecycleStatus,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.list(contextId, organizationId, lifecycleStatus, page, size, sort, direction);
  }

  @GetMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalRequirementDtos.Row detail(@PathVariable UUID contextId, @PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId) {
    return service.detail(contextId, id, organizationId);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalRequirementDtos.Mutation create(@PathVariable UUID contextId,
      @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalRequirementDtos.Create request) {
    return service.create(contextId, organizationId, request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalRequirementDtos.Mutation update(@PathVariable UUID contextId, @PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalRequirementDtos.Update request) {
    return service.update(contextId, id, organizationId, request);
  }

  @PostMapping("/{id}/{action:activate|inactivate|delete|restore}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalRequirementDtos.Version lifecycle(@PathVariable UUID contextId, @PathVariable UUID id,
      @PathVariable String action, @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalRequirementDtos.Lifecycle request) {
    return service.lifecycle(contextId, id, organizationId, request.version(), action);
  }
}

