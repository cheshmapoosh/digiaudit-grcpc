package com.digiaudit.grcpc.modules.masterdata.catalog.policy.api;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.application.*;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.*;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/central/policy-versions")
public class CentralPolicyVersionController {
  private final CentralPolicyVersionCommandService commands;
  private final CentralPolicyVersionQueryService queries;

  public CentralPolicyVersionController(
      CentralPolicyVersionCommandService c, CentralPolicyVersionQueryService q) {
    commands = c;
    queries = q;
  }

  @GetMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('GOVERNANCE')")
  public CentralPolicyDtos.VersionDetail detail(@PathVariable UUID id) {
    return queries.detail(id);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public MasterDataAggregateMutationResponse update(
      @PathVariable UUID id, @Valid @RequestBody CentralPolicyDtos.UpdateVersion r) {
    return commands.update(id, r);
  }

  @PostMapping("/{id}/publish")
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public MasterDataRevisionMutationResponse publish(
      @PathVariable UUID id, @Valid @RequestBody CentralPolicyDtos.VersionCommand r) {
    return commands.publish(id, r.version());
  }

  @PostMapping("/{id}/delete")
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public MasterDataRevisionMutationResponse delete(
      @PathVariable UUID id, @Valid @RequestBody CentralPolicyDtos.VersionCommand r) {
    return commands.delete(id, r.version());
  }

  @PostMapping("/{id}/restore")
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public MasterDataRevisionMutationResponse restore(
      @PathVariable UUID id, @Valid @RequestBody CentralPolicyDtos.VersionCommand r) {
    return commands.restore(id, r.version());
  }
}
