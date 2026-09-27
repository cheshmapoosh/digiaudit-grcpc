package com.digiaudit.grcpc.modules.masterdata.local.api;

import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalControlObjectiveCoverageDtos;
import com.digiaudit.grcpc.modules.masterdata.local.application.LocalControlObjectiveCoverageService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/local/organization-subprocess-scopes/{contextId}/control-control-objective-coverages")
public class LocalControlObjectiveCoverageController {
  private final LocalControlObjectiveCoverageService service;
  public LocalControlObjectiveCoverageController(LocalControlObjectiveCoverageService service) { this.service = service; }

  @GetMapping
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalControlObjectiveCoverageDtos.Page list(@PathVariable UUID contextId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam(required = false) MasterDataLifecycleStatus lifecycleStatus,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.list(contextId, organizationId, lifecycleStatus, page, size, sort, direction);
  }

  @GetMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalControlObjectiveCoverageDtos.Row detail(@PathVariable UUID contextId, @PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId) {
    return service.detail(contextId, id, organizationId);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalControlObjectiveCoverageDtos.Mutation create(@PathVariable UUID contextId,
      @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalControlObjectiveCoverageDtos.Create request) {
    return service.create(contextId, organizationId, request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalControlObjectiveCoverageDtos.Mutation update(@PathVariable UUID contextId, @PathVariable UUID id,
      @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalControlObjectiveCoverageDtos.Update request) {
    return service.update(contextId, id, organizationId, request);
  }

  @PostMapping("/{id}/{action:activate|inactivate|delete|restore}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalControlObjectiveCoverageDtos.Version lifecycle(@PathVariable UUID contextId, @PathVariable UUID id,
      @PathVariable String action, @RequestParam(required = false) UUID organizationId,
      @Valid @RequestBody LocalControlObjectiveCoverageDtos.Lifecycle request) {
    return service.lifecycle(contextId, id, organizationId, request.version(), action);
  }
}

