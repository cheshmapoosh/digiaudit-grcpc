package com.digiaudit.grcpc.modules.masterdata.local.api;

import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalOptionDtos;
import com.digiaudit.grcpc.modules.masterdata.local.application.LocalOptionsService;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/local/organization-subprocess-scopes/{contextId}")
public class LocalCoverageOptionsController {
  private final LocalOptionsService service;
  public LocalCoverageOptionsController(LocalOptionsService service) { this.service = service; }

  @GetMapping("/risk-control-coverages/options")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('RISK') and @masterDataAuthorization.canView('CONTROL')")
  public LocalOptionDtos.Page<LocalOptionDtos.RiskControlCoverage> riskControlCoverages(
      @PathVariable UUID contextId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam UUID localRiskScopeId, @RequestParam UUID localControlScopeId,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.riskControlCoverages(contextId, organizationId, localRiskScopeId, localControlScopeId, q, page, size, sort, direction);
  }

  @GetMapping("/risk-control-objective-coverages/options")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('RISK') and @masterDataAuthorization.canView('CONTROL')")
  public LocalOptionDtos.Page<LocalOptionDtos.RiskObjectiveCoverage> riskObjectiveCoverages(
      @PathVariable UUID contextId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam UUID localRiskScopeId, @RequestParam UUID localControlObjectiveScopeId,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.riskObjectiveCoverages(contextId, organizationId, localRiskScopeId, localControlObjectiveScopeId, q, page, size, sort, direction);
  }

  @GetMapping("/control-control-objective-coverages/options")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalOptionDtos.Page<LocalOptionDtos.ControlObjectiveCoverage> controlObjectiveCoverages(
      @PathVariable UUID contextId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam UUID localControlScopeId, @RequestParam UUID localControlObjectiveScopeId,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.controlObjectiveCoverages(contextId, organizationId, localControlScopeId, localControlObjectiveScopeId, q, page, size, sort, direction);
  }

  @GetMapping("/requirement-control-coverages/options")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE') and @masterDataAuthorization.canView('CONTROL')")
  public LocalOptionDtos.Page<LocalOptionDtos.RequirementControlCoverage> requirementControlCoverages(
      @PathVariable UUID contextId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam UUID localRequirementScopeId, @RequestParam UUID localControlScopeId,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.requirementControlCoverages(contextId, organizationId, localRequirementScopeId, localControlScopeId, q, page, size, sort, direction);
  }
}
