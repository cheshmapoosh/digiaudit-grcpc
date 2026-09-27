package com.digiaudit.grcpc.modules.masterdata.local.api;

import com.digiaudit.grcpc.modules.masterdata.local.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.local.application.LocalReverseService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/local/central")
public class LocalReverseController {
  private final LocalReverseService service;
  public LocalReverseController(LocalReverseService service) { this.service = service; }

  @GetMapping("/risk-templates/{riskTemplateId}/risk-scopes")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('RISK')")
  public LocalRiskDtos.Page riskScopes(@PathVariable UUID riskTemplateId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam(required = false) MasterDataLifecycleStatus lifecycleStatus,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.riskScopes(riskTemplateId, organizationId, lifecycleStatus,
        page, size, sort, direction);
  }

  @GetMapping("/control-objectives/{controlObjectiveId}/control-objective-scopes")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalObjectiveDtos.Page objectiveScopes(@PathVariable UUID controlObjectiveId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam(required = false) MasterDataLifecycleStatus lifecycleStatus,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.objectiveScopes(controlObjectiveId, organizationId, lifecycleStatus,
        page, size, sort, direction);
  }

  @GetMapping("/requirements/{requirementId}/requirement-scopes")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalRequirementDtos.Page requirementScopes(@PathVariable UUID requirementId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam(required = false) MasterDataLifecycleStatus lifecycleStatus,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.requirementScopes(requirementId, organizationId, lifecycleStatus,
        page, size, sort, direction);
  }

  @GetMapping("/policies/{policyId}/organization-policy-scopes")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalOrganizationPolicyDtos.Page organizationPolicies(@PathVariable UUID policyId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam(required = false) MasterDataLifecycleStatus lifecycleStatus,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.organizationPolicies(policyId, organizationId, lifecycleStatus,
        page, size, sort, direction);
  }

  @GetMapping("/policies/{policyId}/subprocess-policy-scopes")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalContextPolicyDtos.Page contextPolicies(@PathVariable UUID policyId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam(required = false) MasterDataLifecycleStatus lifecycleStatus,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.contextPolicies(policyId, organizationId, lifecycleStatus,
        page, size, sort, direction);
  }

  @GetMapping("/policies/{policyId}/control-policy-scopes")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalControlPolicyDtos.Page controlPolicies(@PathVariable UUID policyId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam(required = false) MasterDataLifecycleStatus lifecycleStatus,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.controlPolicies(policyId, organizationId, lifecycleStatus,
        page, size, sort, direction);
  }

  @GetMapping("/policies/{policyId}/requirement-policy-scopes")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalRequirementPolicyDtos.Page requirementPolicies(@PathVariable UUID policyId,
      @RequestParam(required = false) UUID organizationId,
      @RequestParam(required = false) MasterDataLifecycleStatus lifecycleStatus,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.requirementPolicies(policyId, organizationId, lifecycleStatus,
        page, size, sort, direction);
  }
}
