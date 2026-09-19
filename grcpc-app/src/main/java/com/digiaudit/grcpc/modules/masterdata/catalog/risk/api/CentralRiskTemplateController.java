package com.digiaudit.grcpc.modules.masterdata.catalog.risk.api;

import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.application.CentralRiskTemplateCommandService;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.application.CentralRiskTemplateQueryService;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.api.dto.CatalogLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataAggregateMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/central/risk-templates")
public class CentralRiskTemplateController {
  private final CentralRiskTemplateCommandService commands;
  private final CentralRiskTemplateQueryService queries;

  public CentralRiskTemplateController(
      CentralRiskTemplateCommandService commands, CentralRiskTemplateQueryService queries) {
    this.commands = commands;
    this.queries = queries;
  }

  @GetMapping
  @PreAuthorize("@masterDataAuthorization.canView('RISK')")
  public List<CentralRiskTemplateSummaryResponse> list(
      @RequestParam(required = false) UUID categoryId) {
    return queries.list(categoryId);
  }

  @GetMapping("/deleted")
  @PreAuthorize("@masterDataAuthorization.canView('RISK')")
  public List<CentralRiskTemplateSummaryResponse> deleted() {
    return queries.listDeleted();
  }

  @GetMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('RISK')")
  public CentralRiskTemplateResponse detail(@PathVariable UUID id) {
    return queries.detail(id);
  }

  @PostMapping
  @PreAuthorize("@masterDataAuthorization.canManage('RISK')")
  public MasterDataAggregateMutationResponse create(
      @Valid @RequestBody CreateCentralRiskTemplateRequest request) {
    return commands.create(request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('RISK')")
  public MasterDataAggregateMutationResponse update(
      @PathVariable UUID id, @Valid @RequestBody UpdateCentralRiskTemplateRequest request) {
    return commands.update(id, request);
  }

  @PostMapping("/{id}/move")
  @PreAuthorize("@masterDataAuthorization.canManage('RISK')")
  public MasterDataRevisionMutationResponse move(
      @PathVariable UUID id, @Valid @RequestBody MoveCentralRiskTemplateRequest request) {
    return commands.move(id, request);
  }

  @PostMapping("/{id}/activate")
  @PreAuthorize("@masterDataAuthorization.canManage('RISK')")
  public MasterDataRevisionMutationResponse activate(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest request) {
    return commands.activate(id, request.version());
  }

  @PostMapping("/{id}/inactivate")
  @PreAuthorize("@masterDataAuthorization.canManage('RISK')")
  public MasterDataRevisionMutationResponse inactivate(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest request) {
    return commands.inactivate(id, request.version());
  }

  @PostMapping("/{id}/delete")
  @PreAuthorize("@masterDataAuthorization.canManage('RISK')")
  public MasterDataRevisionMutationResponse delete(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest request) {
    return commands.delete(id, request.version());
  }

  @PostMapping("/{id}/restore")
  @PreAuthorize("@masterDataAuthorization.canManage('RISK')")
  public MasterDataRevisionMutationResponse restore(
      @PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest request) {
    return commands.restore(id, request.version());
  }
}
