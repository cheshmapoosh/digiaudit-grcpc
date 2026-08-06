package com.digiaudit.grcpc.modules.masterdata.catalog.risk.api;

import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.application.CentralRiskTemplateCommandService;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.application.CentralRiskTemplateQueryService;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.api.dto.CatalogLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataAggregateMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/master-data/central/risk-templates")
public class CentralRiskTemplateController {
    private final CentralRiskTemplateCommandService commands;
    private final CentralRiskTemplateQueryService queries;
    public CentralRiskTemplateController(CentralRiskTemplateCommandService commands, CentralRiskTemplateQueryService queries) { this.commands = commands; this.queries = queries; }

    @GetMapping @PreAuthorize("hasAuthority('CENTRAL_RISK_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<CentralRiskTemplateSummaryResponse> list(@RequestParam(required = false) UUID categoryId) { return queries.list(categoryId); }
    @GetMapping("/deleted") @PreAuthorize("hasAuthority('CENTRAL_RISK_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<CentralRiskTemplateSummaryResponse> deleted() { return queries.listDeleted(); }
    @GetMapping("/{id}") @PreAuthorize("hasAuthority('CENTRAL_RISK_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public CentralRiskTemplateResponse detail(@PathVariable UUID id) { return queries.detail(id); }
    @PostMapping @PreAuthorize("hasAuthority('CENTRAL_RISK_CREATE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataAggregateMutationResponse create(@Valid @RequestBody CreateCentralRiskTemplateRequest request) { return commands.create(request); }
    @PatchMapping("/{id}") @PreAuthorize("hasAuthority('CENTRAL_RISK_UPDATE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataAggregateMutationResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateCentralRiskTemplateRequest request) { return commands.update(id, request); }
    @PostMapping("/{id}/move") @PreAuthorize("hasAuthority('CENTRAL_RISK_MOVE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataRevisionMutationResponse move(@PathVariable UUID id, @Valid @RequestBody MoveCentralRiskTemplateRequest request) { return commands.move(id, request); }
    @PostMapping("/{id}/activate") @PreAuthorize("hasAuthority('CENTRAL_RISK_LIFECYCLE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataRevisionMutationResponse activate(@PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest request) { return commands.activate(id, request.version()); }
    @PostMapping("/{id}/inactivate") @PreAuthorize("hasAuthority('CENTRAL_RISK_LIFECYCLE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataRevisionMutationResponse inactivate(@PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest request) { return commands.inactivate(id, request.version()); }
    @PostMapping("/{id}/delete") @PreAuthorize("hasAuthority('CENTRAL_RISK_DELETE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataRevisionMutationResponse delete(@PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest request) { return commands.delete(id, request.version()); }
    @PostMapping("/{id}/restore") @PreAuthorize("hasAuthority('CENTRAL_RISK_RESTORE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataRevisionMutationResponse restore(@PathVariable UUID id, @Valid @RequestBody CatalogLifecycleCommandRequest request) { return commands.restore(id, request.version()); }
}
