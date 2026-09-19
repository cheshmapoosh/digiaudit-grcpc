package com.digiaudit.grcpc.modules.masterdata.catalog.risk.api;

import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.application.CentralRiskCategoryCommandService;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.application.CentralRiskCategoryQueryService;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.api.dto.CatalogLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataAggregateMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/central/risk-categories")
public class CentralRiskCategoryController {
  private final CentralRiskCategoryCommandService commands;
  private final CentralRiskCategoryQueryService queries;

  public CentralRiskCategoryController(
      CentralRiskCategoryCommandService commands, CentralRiskCategoryQueryService queries) {
    this.commands = commands;
    this.queries = queries;
  }

  @GetMapping
  @PreAuthorize("@masterDataAuthorization.canView('RISK')")
  public List<CentralRiskCategorySummaryResponse> list() {
    return queries.list();
  }

  @GetMapping("/deleted")
  @PreAuthorize("@masterDataAuthorization.canView('RISK')")
  public List<CentralRiskCategorySummaryResponse> deleted() {
    return queries.listDeleted();
  }

  @GetMapping("/tree")
  @PreAuthorize("@masterDataAuthorization.canView('RISK')")
  public List<CentralRiskCategoryTreeResponse> tree() {
    return queries.tree();
  }

  @GetMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('RISK')")
  public CentralRiskCategoryResponse detail(@PathVariable UUID id) {
    return queries.detail(id);
  }

  @PostMapping
  @PreAuthorize("@masterDataAuthorization.canManage('RISK')")
  public MasterDataAggregateMutationResponse create(
      @Valid @RequestBody CreateCentralRiskCategoryRequest request) {
    return commands.create(request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('RISK')")
  public MasterDataAggregateMutationResponse update(
      @PathVariable UUID id, @Valid @RequestBody UpdateCentralRiskCategoryRequest request) {
    return commands.update(id, request);
  }

  @PostMapping("/{id}/move")
  @PreAuthorize("@masterDataAuthorization.canManage('RISK')")
  public MasterDataRevisionMutationResponse move(
      @PathVariable UUID id, @Valid @RequestBody MoveCentralRiskCategoryRequest request) {
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
