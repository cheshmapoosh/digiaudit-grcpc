package com.digiaudit.grcpc.modules.masterdata.local.api;

import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalContextDtos;
import com.digiaudit.grcpc.modules.masterdata.local.application.LocalContextService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/local")
public class LocalContextController {
  private final LocalContextService service;
  public LocalContextController(LocalContextService service) { this.service = service; }

  @GetMapping("/organizations/{organizationId}/contexts")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS')")
  public LocalContextDtos.Page list(@PathVariable UUID organizationId,
      @RequestParam(required = false) UUID subprocessId,
      @RequestParam(required = false) MasterDataLifecycleStatus lifecycleStatus,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.list(organizationId, subprocessId, lifecycleStatus, page, size, sort, direction);
  }

  @GetMapping("/organization-subprocess-scopes/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS')")
  public LocalContextDtos.Row detail(@PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId) {
    return service.detail(id, organizationId);
  }

  @PostMapping("/organization-subprocess-scopes")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS')")
  public LocalContextDtos.Mutation create(@Valid @RequestBody LocalContextDtos.Create request) {
    return service.create(request);
  }

  @PatchMapping("/organization-subprocess-scopes/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS')")
  public LocalContextDtos.Mutation update(@PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalContextDtos.Update request) {
    return service.update(id, organizationId, request);
  }

  @PostMapping("/organization-subprocess-scopes/{id}/{action:activate|inactivate|delete|restore}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS')")
  public LocalContextDtos.Version lifecycle(@PathVariable UUID id, @PathVariable String action,
      @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalContextDtos.Lifecycle request) {
    return service.lifecycle(id, organizationId, request.version(), action);
  }
}
