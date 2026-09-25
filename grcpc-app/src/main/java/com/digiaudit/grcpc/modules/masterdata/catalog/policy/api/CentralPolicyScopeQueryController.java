package com.digiaudit.grcpc.modules.masterdata.catalog.policy.api;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.application.*;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/central/policies")
public class CentralPolicyScopeQueryController {
  private final CentralPolicySubprocessScopeQueryService subprocess;
  private final CentralPolicyOrganizationScopeQueryService organization;
  private final CentralPolicyControlScopeQueryService control;
  private final CentralPolicyRequirementScopeQueryService requirement;
  public CentralPolicyScopeQueryController(CentralPolicySubprocessScopeQueryService subprocess, CentralPolicyOrganizationScopeQueryService organization, CentralPolicyControlScopeQueryService control, CentralPolicyRequirementScopeQueryService requirement) {
    this.subprocess = subprocess;
    this.organization = organization;
    this.control = control;
    this.requirement = requirement;
  }

  @GetMapping("/{policyId}/subprocess-scopes")
  public List<CentralPolicyDtos.PolicySubprocessScopeResponse> subprocessScopes(
      @PathVariable UUID policyId, @RequestParam(required = false) MasterDataLifecycleStatus status,
      @RequestParam(required = false) String search) {
    return subprocess.list(policyId, status, search);
  }
  @GetMapping("/{policyId}/subprocess-scopes/deleted")
  public List<CentralPolicyDtos.PolicySubprocessScopeResponse> deletedSubprocessScopes(
      @PathVariable UUID policyId, @RequestParam(required = false) String search) {
    return subprocess.deleted(policyId, search);
  }
  @GetMapping("/{policyId}/subprocess-scopes/{relationId}")
  public CentralPolicyDtos.PolicySubprocessScopeResponse subprocessScope(
      @PathVariable UUID policyId, @PathVariable UUID relationId) {
    return subprocess.detail(policyId, relationId);
  }
  @GetMapping("/scope-options/subprocesses")
  public List<CentralPolicyDtos.PolicySubprocessOption> subprocessOptions(
      @RequestParam(required = false) String search) {
    return subprocess.options(search);
  }

  @GetMapping("/{policyId}/organization-scopes")
  public List<CentralPolicyDtos.PolicyOrganizationScopeResponse> organizationScopes(
      @PathVariable UUID policyId, @RequestParam(required = false) MasterDataLifecycleStatus status,
      @RequestParam(required = false) String search) {
    return organization.list(policyId, status, search);
  }
  @GetMapping("/{policyId}/organization-scopes/deleted")
  public List<CentralPolicyDtos.PolicyOrganizationScopeResponse> deletedOrganizationScopes(
      @PathVariable UUID policyId, @RequestParam(required = false) String search) {
    return organization.deleted(policyId, search);
  }
  @GetMapping("/{policyId}/organization-scopes/{relationId}")
  public CentralPolicyDtos.PolicyOrganizationScopeResponse organizationScope(
      @PathVariable UUID policyId, @PathVariable UUID relationId) {
    return organization.detail(policyId, relationId);
  }
  @GetMapping("/scope-options/organizations")
  public List<CentralPolicyDtos.PolicyOrganizationOption> organizationOptions(
      @RequestParam(required = false) String search) {
    return organization.options(search);
  }

  @GetMapping("/{policyId}/control-scopes")
  public List<CentralPolicyDtos.PolicyControlScopeResponse> controlScopes(
      @PathVariable UUID policyId, @RequestParam(required = false) MasterDataLifecycleStatus status,
      @RequestParam(required = false) String search) {
    return control.list(policyId, status, search);
  }
  @GetMapping("/{policyId}/control-scopes/deleted")
  public List<CentralPolicyDtos.PolicyControlScopeResponse> deletedControlScopes(
      @PathVariable UUID policyId, @RequestParam(required = false) String search) {
    return control.deleted(policyId, search);
  }
  @GetMapping("/{policyId}/control-scopes/{relationId}")
  public CentralPolicyDtos.PolicyControlScopeResponse controlScope(
      @PathVariable UUID policyId, @PathVariable UUID relationId) {
    return control.detail(policyId, relationId);
  }
  @GetMapping("/scope-options/controls")
  public List<CentralPolicyDtos.PolicyControlOption> controlOptions(
      @RequestParam(required = false) String search) {
    return control.options(search);
  }

  @GetMapping("/{policyId}/requirement-scopes")
  public List<CentralPolicyDtos.PolicyRequirementScopeResponse> requirementScopes(
      @PathVariable UUID policyId, @RequestParam(required = false) MasterDataLifecycleStatus status,
      @RequestParam(required = false) String search) {
    return requirement.list(policyId, status, search);
  }
  @GetMapping("/{policyId}/requirement-scopes/deleted")
  public List<CentralPolicyDtos.PolicyRequirementScopeResponse> deletedRequirementScopes(
      @PathVariable UUID policyId, @RequestParam(required = false) String search) {
    return requirement.deleted(policyId, search);
  }
  @GetMapping("/{policyId}/requirement-scopes/{relationId}")
  public CentralPolicyDtos.PolicyRequirementScopeResponse requirementScope(
      @PathVariable UUID policyId, @PathVariable UUID relationId) {
    return requirement.detail(policyId, relationId);
  }
  @GetMapping("/scope-options/requirements")
  public List<CentralPolicyDtos.PolicyRequirementOption> requirementOptions(
      @RequestParam(required = false) String search) {
    return requirement.options(search);
  }
}

