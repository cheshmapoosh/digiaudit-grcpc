package com.digiaudit.grcpc.modules.masterdata.catalog.control.api;

import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CentralControlGroupDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.application.CentralControlGroupCommandService;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.application.CentralControlGroupQueryService;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.api.dto.CatalogLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/master-data/central/control-groups")
public class CentralControlGroupController {
  private final CentralControlGroupCommandService commands;
  private final CentralControlGroupQueryService queries;

  public CentralControlGroupController(
      CentralControlGroupCommandService commands, CentralControlGroupQueryService queries) {
    this.commands = commands;
    this.queries = queries;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public List<CentralControlGroupDtos.Summary> list() {
    return queries.list();
  }

  @GetMapping("/deleted")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public List<CentralControlGroupDtos.Summary> deleted() {
    return queries.deleted();
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public CentralControlGroupDtos.Detail detail(@PathVariable UUID id) {
    return queries.detail(id);
  }

  @PostMapping
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_CREATE') or hasAuthority('ROLE_ROOT_ADMIN')")
  public MasterDataRevisionMutationResponse create(
      @Valid @RequestBody CentralControlGroupDtos.Create request) {
    return commands.create(request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_UPDATE') or hasAuthority('ROLE_ROOT_ADMIN')")
  public MasterDataRevisionMutationResponse update(
      @PathVariable UUID id, @Valid @RequestBody CentralControlGroupDtos.Update request) {
    return commands.update(id, request);
  }

  @PostMapping("/{id}/activate")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_LIFECYCLE') or hasAuthority('ROLE_ROOT_ADMIN')")
  public MasterDataRevisionMutationResponse activate(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest request) {
    return commands.activate(id, request.version());
  }

  @PostMapping("/{id}/inactivate")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_LIFECYCLE') or hasAuthority('ROLE_ROOT_ADMIN')")
  public MasterDataRevisionMutationResponse inactivate(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest request) {
    return commands.inactivate(id, request.version());
  }

  @PostMapping("/{id}/delete")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_DELETE') or hasAuthority('ROLE_ROOT_ADMIN')")
  public MasterDataRevisionMutationResponse delete(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest request) {
    return commands.delete(id, request.version());
  }

  @PostMapping("/{id}/restore")
  @PreAuthorize("hasAuthority('CENTRAL_CONTROL_RESTORE') or hasAuthority('ROLE_ROOT_ADMIN')")
  public MasterDataRevisionMutationResponse restore(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest request) {
    return commands.restore(id, request.version());
  }
}
