package com.digiaudit.grcpc.modules.masterdata.catalog.control.api;

import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CentralControlResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CentralControlSummaryResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CreateCentralControlRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.UpdateCentralControlRequest;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.application.CentralControlCommandService;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.application.CentralControlQueryService;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto.CentralControlAggregateMutationResponse;
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
@RequestMapping("/api/master-data/central/controls")
public class CentralControlController {
  private final CentralControlCommandService commands;
  private final CentralControlQueryService queries;

  public CentralControlController(
      CentralControlCommandService commands, CentralControlQueryService queries) {
    this.commands = commands;
    this.queries = queries;
  }

  @GetMapping
  @PreAuthorize("@masterDataAuthorization.canView('CONTROL')")
  public List<CentralControlSummaryResponse> list() {
    return queries.list();
  }

  @GetMapping("/deleted")
  @PreAuthorize("@masterDataAuthorization.canView('CONTROL')")
  public List<CentralControlSummaryResponse> deleted() {
    return queries.listDeleted();
  }

  @GetMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('CONTROL')")
  public CentralControlResponse detail(@PathVariable UUID id) {
    return queries.detail(id);
  }

  @PostMapping
  @PreAuthorize("@masterDataAuthorization.canManage('CONTROL')")
  public CentralControlAggregateMutationResponse create(
      @Valid @RequestBody CreateCentralControlRequest request) {
    return commands.create(request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('CONTROL')")
  public CentralControlAggregateMutationResponse update(
      @PathVariable UUID id, @Valid @RequestBody UpdateCentralControlRequest request) {
    return commands.update(id, request);
  }

  @PostMapping("/{id}/activate")
  @PreAuthorize("@masterDataAuthorization.canManage('CONTROL')")
  public MasterDataRevisionMutationResponse activate(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest request) {
    return commands.activate(id, request.version());
  }

  @PostMapping("/{id}/inactivate")
  @PreAuthorize("@masterDataAuthorization.canManage('CONTROL')")
  public MasterDataRevisionMutationResponse inactivate(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest request) {
    return commands.inactivate(id, request.version());
  }

  @PostMapping("/{id}/delete")
  @PreAuthorize("@masterDataAuthorization.canManage('CONTROL')")
  public MasterDataRevisionMutationResponse delete(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest request) {
    return commands.delete(id, request.version());
  }

  @PostMapping("/{id}/restore")
  @PreAuthorize("@masterDataAuthorization.canManage('CONTROL')")
  public MasterDataRevisionMutationResponse restore(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest request) {
    return commands.restore(id, request.version());
  }
}
