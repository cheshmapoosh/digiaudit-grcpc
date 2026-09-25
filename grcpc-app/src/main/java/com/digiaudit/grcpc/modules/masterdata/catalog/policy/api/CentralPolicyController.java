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
@RequestMapping("/api/master-data/central/policies")
public class CentralPolicyController {
  private final CentralPolicyCommandService commands;
  private final CentralPolicyQueryService queries;

  public CentralPolicyController(
      CentralPolicyCommandService c,
      CentralPolicyQueryService q) {
    commands = c;
    queries = q;
  }

  @GetMapping
  @PreAuthorize("@masterDataAuthorization.canView('GOVERNANCE')")
  public List<CentralPolicyDtos.PolicySummary> list(@RequestParam(required = false) UUID groupId) {
    return queries.policies(groupId);
  }

  @GetMapping("/deleted")
  @PreAuthorize("@masterDataAuthorization.canView('GOVERNANCE')")
  public List<CentralPolicyDtos.PolicySummary> deleted() {
    return queries.deletedPolicies();
  }

  @GetMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('GOVERNANCE')")
  public CentralPolicyDtos.PolicyDetail detail(@PathVariable UUID id) {
    return queries.policy(id);
  }

  @PostMapping
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public CentralPolicyDtos.PolicyAggregateResponse create(
      @Valid @RequestBody CentralPolicyDtos.CreatePolicy r) {
    return commands.create(r);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public CentralPolicyDtos.PolicyAggregateResponse update(
      @PathVariable UUID id, @Valid @RequestBody CentralPolicyDtos.UpdatePolicy r) {
    return commands.update(id, r);
  }

  @PostMapping("/{id}/move")
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public MasterDataRevisionMutationResponse move(
      @PathVariable UUID id, @Valid @RequestBody CentralPolicyDtos.MovePolicy r) {
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
