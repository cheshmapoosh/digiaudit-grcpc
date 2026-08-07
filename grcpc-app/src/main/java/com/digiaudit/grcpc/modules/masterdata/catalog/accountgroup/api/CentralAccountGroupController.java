package com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.api;

import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.api.dto.CentralAccountGroupDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.application.CentralAccountGroupCommandService;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.application.CentralAccountGroupQueryService;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.api.dto.CatalogLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataAggregateMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/central/account-groups")
public class CentralAccountGroupController {
  private final CentralAccountGroupCommandService commands;
  private final CentralAccountGroupQueryService queries;

  public CentralAccountGroupController(
      CentralAccountGroupCommandService commands, CentralAccountGroupQueryService queries) {
    this.commands = commands;
    this.queries = queries;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('CENTRAL_ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public List<CentralAccountGroupDtos.Summary> list() {
    return queries.list();
  }

  @GetMapping("/deleted")
  @PreAuthorize("hasAuthority('CENTRAL_ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public List<CentralAccountGroupDtos.Summary> deleted() {
    return queries.deleted();
  }

  @GetMapping("/tree")
  @PreAuthorize("hasAuthority('CENTRAL_ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public List<CentralAccountGroupDtos.Tree> tree() {
    return queries.tree();
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('CENTRAL_ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
  public CentralAccountGroupDtos.Detail detail(@PathVariable UUID id) {
    return queries.detail(id);
  }

  @PostMapping
  @PreAuthorize("hasAuthority('CENTRAL_ACCOUNT_GROUP_CREATE') or hasAuthority('ROLE_ROOT_ADMIN')")
  public MasterDataAggregateMutationResponse create(
      @Valid @RequestBody CentralAccountGroupDtos.Create request) {
    return commands.create(request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAuthority('CENTRAL_ACCOUNT_GROUP_UPDATE') or hasAuthority('ROLE_ROOT_ADMIN')")
  public MasterDataAggregateMutationResponse update(
      @PathVariable UUID id, @Valid @RequestBody CentralAccountGroupDtos.Update request) {
    return commands.update(id, request);
  }

  @PostMapping("/{id}/move")
  @PreAuthorize("hasAuthority('CENTRAL_ACCOUNT_GROUP_MOVE') or hasAuthority('ROLE_ROOT_ADMIN')")
  public MasterDataRevisionMutationResponse move(
      @PathVariable UUID id, @Valid @RequestBody CentralAccountGroupDtos.Move request) {
    return commands.move(id, request);
  }

  @PostMapping("/{id}/activate")
  @PreAuthorize(
      "hasAuthority('CENTRAL_ACCOUNT_GROUP_LIFECYCLE') or hasAuthority('ROLE_ROOT_ADMIN')")
  public MasterDataRevisionMutationResponse activate(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest r) {
    return commands.activate(id, r.version());
  }

  @PostMapping("/{id}/inactivate")
  @PreAuthorize(
      "hasAuthority('CENTRAL_ACCOUNT_GROUP_LIFECYCLE') or hasAuthority('ROLE_ROOT_ADMIN')")
  public MasterDataRevisionMutationResponse inactivate(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest r) {
    return commands.inactivate(id, r.version());
  }

  @PostMapping("/{id}/delete")
  @PreAuthorize("hasAuthority('CENTRAL_ACCOUNT_GROUP_DELETE') or hasAuthority('ROLE_ROOT_ADMIN')")
  public MasterDataRevisionMutationResponse delete(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest r) {
    return commands.delete(id, r.version());
  }

  @PostMapping("/{id}/restore")
  @PreAuthorize("hasAuthority('CENTRAL_ACCOUNT_GROUP_RESTORE') or hasAuthority('ROLE_ROOT_ADMIN')")
  public MasterDataRevisionMutationResponse restore(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest r) {
    return commands.restore(id, r.version());
  }
}
