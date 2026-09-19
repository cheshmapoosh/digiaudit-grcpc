package com.digiaudit.grcpc.modules.masterdata.catalog.policy.api;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.application.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.api.dto.CatalogLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/central/policy-groups")
public class CentralPolicyGroupController {
  private final CentralPolicyGroupCommandService commands;
  private final CentralPolicyGroupQueryService queries;

  public CentralPolicyGroupController(
      CentralPolicyGroupCommandService c, CentralPolicyGroupQueryService q) {
    commands = c;
    queries = q;
  }

  @GetMapping
  @PreAuthorize("@masterDataAuthorization.canView('GOVERNANCE')")
  public List<CentralPolicyDtos.GroupSummary> list() {
    return queries.list();
  }

  @GetMapping("/deleted")
  @PreAuthorize("@masterDataAuthorization.canView('GOVERNANCE')")
  public List<CentralPolicyDtos.GroupSummary> deleted() {
    return queries.deleted();
  }

  @GetMapping("/tree")
  @PreAuthorize("@masterDataAuthorization.canView('GOVERNANCE')")
  public List<CentralPolicyDtos.GroupTree> tree() {
    return queries.tree();
  }

  @GetMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('GOVERNANCE')")
  public CentralPolicyDtos.GroupDetail detail(@PathVariable UUID id) {
    return queries.detail(id);
  }

  @PostMapping
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public MasterDataAggregateMutationResponse create(
      @Valid @RequestBody CentralPolicyDtos.CreateGroup r) {
    return commands.create(r);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public MasterDataAggregateMutationResponse update(
      @PathVariable UUID id, @Valid @RequestBody CentralPolicyDtos.UpdateGroup r) {
    return commands.update(id, r);
  }

  @PostMapping("/{id}/move")
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public MasterDataRevisionMutationResponse move(
      @PathVariable UUID id, @Valid @RequestBody CentralPolicyDtos.MoveGroup r) {
    return commands.move(id, r);
  }

  @PostMapping("/{id}/activate")
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public MasterDataRevisionMutationResponse activate(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest r) {
    return commands.activate(id, r.version());
  }

  @PostMapping("/{id}/inactivate")
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public MasterDataRevisionMutationResponse inactivate(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest r) {
    return commands.inactivate(id, r.version());
  }

  @PostMapping("/{id}/delete")
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public MasterDataRevisionMutationResponse delete(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest r) {
    return commands.delete(id, r.version());
  }

  @PostMapping("/{id}/restore")
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public MasterDataRevisionMutationResponse restore(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest r) {
    return commands.restore(id, r.version());
  }
}
