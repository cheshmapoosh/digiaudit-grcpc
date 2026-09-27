package com.digiaudit.grcpc.modules.masterdata.local.api;

import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalOptionDtos;
import com.digiaudit.grcpc.modules.masterdata.local.application.LocalOptionsService;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/local")
public class LocalReferenceOptionsController {
  private final LocalOptionsService service;
  public LocalReferenceOptionsController(LocalOptionsService service) { this.service = service; }

  @GetMapping("/organization-subprocess-scopes/{contextId}/control-scopes/options")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalOptionDtos.Page<LocalOptionDtos.ControlScope> controlScopes(
      @PathVariable UUID contextId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam UUID controlId,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.controlScopes(contextId, organizationId, controlId, q, page, size, sort, direction);
  }

  @GetMapping("/organization-subprocess-scopes/{contextId}/risk-scopes/options")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('RISK')")
  public LocalOptionDtos.Page<LocalOptionDtos.RiskScope> riskScopes(
      @PathVariable UUID contextId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam UUID riskTemplateId,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.riskScopes(contextId, organizationId, riskTemplateId, q, page, size, sort, direction);
  }

  @GetMapping("/organization-subprocess-scopes/{contextId}/control-objective-scopes/options")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalOptionDtos.Page<LocalOptionDtos.ObjectiveScope> objectiveScopes(
      @PathVariable UUID contextId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam UUID controlObjectiveId,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.objectiveScopes(contextId, organizationId, controlObjectiveId, q, page, size, sort, direction);
  }

  @GetMapping("/organization-subprocess-scopes/{contextId}/requirement-scopes/options")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalOptionDtos.Page<LocalOptionDtos.RequirementScope> requirementScopes(
      @PathVariable UUID contextId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam UUID requirementId,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.requirementScopes(contextId, organizationId, requirementId, q, page, size, sort, direction);
  }

  @GetMapping("/options/central-control-scopes")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalOptionDtos.Page<LocalOptionDtos.ControlScope> centralControlScopes(
      @RequestParam UUID subprocessId, @RequestParam UUID controlId,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.centralControlScopes(subprocessId, controlId, q, page, size, sort, direction);
  }
}
