package com.digiaudit.grcpc.modules.masterdata.globalcontrol.api;

import com.digiaudit.grcpc.modules.masterdata.catalog.shared.api.dto.CatalogLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.application.ControlGroupService;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/control-groups")
public class ControlGroupController {
  private final ControlGroupService service;

  public ControlGroupController(ControlGroupService service) {
    this.service = service;
  }

  @GetMapping
  @PreAuthorize("@masterDataAuthorization.canView('CONTROL')")
  public List<ControlGroupDtos.Detail> list() { return service.list(); }

  @GetMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('CONTROL')")
  public ControlGroupDtos.Detail detail(@PathVariable UUID id) { return service.get(id); }

  @PostMapping
  @PreAuthorize("@masterDataAuthorization.canManage('CONTROL')")
  public MasterDataRevisionMutationResponse create(@Valid @RequestBody ControlGroupDtos.Create request) {
    return service.create(request);
  }

  @PutMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('CONTROL')")
  public MasterDataRevisionMutationResponse update(@PathVariable UUID id,
      @Valid @RequestBody ControlGroupDtos.Update request) {
    return service.update(id, request);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('CONTROL')")
  public MasterDataRevisionMutationResponse delete(@PathVariable UUID id, @RequestParam Long version) {
    return service.delete(id, version);
  }

  @PostMapping("/{id}/restore")
  @PreAuthorize("@masterDataAuthorization.canManage('CONTROL')")
  public MasterDataRevisionMutationResponse restore(@PathVariable UUID id,
      @Valid @RequestBody CatalogLifecycleCommandRequest request) {
    return service.restore(id, request.version());
  }
}
