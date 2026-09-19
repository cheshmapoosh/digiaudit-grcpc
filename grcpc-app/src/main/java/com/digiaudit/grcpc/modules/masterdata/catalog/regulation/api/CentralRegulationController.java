package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api;

import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.CentralRegulationDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.application.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.api.dto.CatalogLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/central/regulations")
public class CentralRegulationController {
  private final CentralRegulationCommandService commands;
  private final CentralRegulationQueryService queries;

  public CentralRegulationController(
      CentralRegulationCommandService c, CentralRegulationQueryService q) {
    commands = c;
    queries = q;
  }

  @GetMapping
  @PreAuthorize("@masterDataAuthorization.canView('GOVERNANCE')")
  public List<CentralRegulationDtos.RegulationSummary> list(
      @RequestParam(required = false) UUID groupId) {
    return queries.regulations(groupId);
  }

  @GetMapping("/deleted")
  @PreAuthorize("@masterDataAuthorization.canView('GOVERNANCE')")
  public List<CentralRegulationDtos.RegulationSummary> deleted() {
    return queries.deletedRegulations();
  }

  @GetMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('GOVERNANCE')")
  public CentralRegulationDtos.RegulationDetail detail(@PathVariable UUID id) {
    return queries.regulation(id);
  }

  @PostMapping
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public MasterDataAggregateMutationResponse create(
      @Valid @RequestBody CentralRegulationDtos.CreateRegulation r) {
    return commands.create(r);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public MasterDataAggregateMutationResponse update(
      @PathVariable UUID id, @Valid @RequestBody CentralRegulationDtos.UpdateRegulation r) {
    return commands.update(id, r);
  }

  @PostMapping("/{id}/move")
  @PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
  public MasterDataRevisionMutationResponse move(
      @PathVariable UUID id, @Valid @RequestBody CentralRegulationDtos.MoveRegulation r) {
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
