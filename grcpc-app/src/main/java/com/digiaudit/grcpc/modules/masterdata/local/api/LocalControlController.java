package com.digiaudit.grcpc.modules.masterdata.local.api;

import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalControlDtos;
import com.digiaudit.grcpc.modules.masterdata.local.application.LocalControlService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/local")
public class LocalControlController {
  private final LocalControlService service;
  public LocalControlController(LocalControlService service) { this.service = service; }

  @GetMapping("/organization-subprocess-scopes/{contextId}/control-scopes")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalControlDtos.Page list(@PathVariable UUID contextId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam(required = false) MasterDataLifecycleStatus lifecycleStatus,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.list(contextId, organizationId, lifecycleStatus, page, size, sort, direction);
  }

  @GetMapping("/organization-subprocess-scopes/{contextId}/control-scopes/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalControlDtos.Row detail(@PathVariable UUID contextId, @PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId) {
    return service.detail(contextId, id, organizationId);
  }

  @PostMapping("/organization-subprocess-scopes/{contextId}/control-scopes")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalControlDtos.Mutation create(@PathVariable UUID contextId,
      @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalControlDtos.Create request) {
    return service.create(contextId, organizationId, request);
  }

  @PostMapping("/control-assignments")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalControlDtos.AssignmentMutation assign(@Valid @RequestBody LocalControlDtos.Assignment request) {
    return service.assign(request);
  }

  @PatchMapping("/organization-subprocess-scopes/{contextId}/control-scopes/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalControlDtos.Mutation update(@PathVariable UUID contextId, @PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalControlDtos.Update request) {
    return service.update(contextId, id, organizationId, request);
  }

  @PostMapping("/organization-subprocess-scopes/{contextId}/control-scopes/{id}/{action:activate|inactivate|delete|restore}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalControlDtos.Version lifecycle(@PathVariable UUID contextId, @PathVariable UUID id,
      @PathVariable String action, @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalControlDtos.Lifecycle request) {
    return service.lifecycle(contextId, id, organizationId, request.version(), action);
  }
}
