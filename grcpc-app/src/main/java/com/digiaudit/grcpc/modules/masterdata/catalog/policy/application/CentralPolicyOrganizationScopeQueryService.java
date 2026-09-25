package com.digiaudit.grcpc.modules.masterdata.catalog.policy.application;

import com.digiaudit.grcpc.common.exception.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.mapper.CentralPolicyOrganizationScopeMapper;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyOrganizationScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository.CentralPolicyOrganizationScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository.CentralPolicyRepository;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationRepository;

import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CentralPolicyOrganizationScopeQueryService {
  private final CentralPolicyOrganizationScopeRepository relations;
  private final OrganizationRepository endpoints;
  
  private final CentralPolicyRepository policies;
  private final CentralPolicyOrganizationScopeMapper mapper;
  private final MasterDataAuthorizationService authorization;
  public CentralPolicyOrganizationScopeQueryService(CentralPolicyOrganizationScopeRepository relations, OrganizationRepository endpoints,
      CentralPolicyRepository policies, CentralPolicyOrganizationScopeMapper mapper, MasterDataAuthorizationService authorization) {
    this.relations = relations; this.endpoints = endpoints;
    
    this.policies = policies; this.mapper = mapper; this.authorization = authorization;
  }
  @Transactional(readOnly = true)
  public List<CentralPolicyDtos.PolicyOrganizationScopeResponse> list(UUID policyId,
      MasterDataLifecycleStatus status, String search) {
    requireAccess();
    if (status == MasterDataLifecycleStatus.DELETED)
      throw new UnprocessableEntityException("INVALID_LIFECYCLE_FILTER", "error.masterdata.v2.invalidLifecycleFilter", "Use the deleted read");
    requirePolicy(policyId);
    var rows = status == null
        ? relations.findByPolicyIdAndStatusNot(policyId, MasterDataLifecycleStatus.DELETED)
        : relations.findByPolicyIdAndStatus(policyId, status);
    return rows.stream().map(this::mapOrganization)
        .filter(row -> matches(row.toString(), search))
        .sorted(Comparator.comparing(CentralPolicyDtos.PolicyOrganizationScopeResponse::id)).toList();
  }
  @Transactional(readOnly = true)
  public List<CentralPolicyDtos.PolicyOrganizationScopeResponse> deleted(UUID policyId, String search) {
    requireAccess(); requirePolicy(policyId);
    return relations.findByPolicyIdAndStatus(policyId, MasterDataLifecycleStatus.DELETED).stream()
        .map(this::mapOrganization).filter(row -> matches(row.toString(), search))
        .sorted(Comparator.comparing(CentralPolicyDtos.PolicyOrganizationScopeResponse::id)).toList();
  }
  @Transactional(readOnly = true)
  public CentralPolicyDtos.PolicyOrganizationScopeResponse detail(UUID policyId, UUID relationId) {
    requireAccess(); requirePolicy(policyId);
    var row = relations.findById(relationId).orElseThrow(() -> missing(relationId));
    if (!row.getPolicyId().equals(policyId) || row.getStatus() == MasterDataLifecycleStatus.DELETED)
      throw missing(relationId);
    return mapOrganization(row);
  }
  @Transactional(readOnly = true)
  public List<CentralPolicyDtos.PolicyOrganizationOption> options(String search) {
    requireAccess();
    return endpoints.findAll().stream().filter(e -> e.getStatus() == MasterDataLifecycleStatus.ACTIVE)
        .map(e -> {
          var parent = e.getParentOrganizationId() == null ? null : endpoints.findById(e.getParentOrganizationId()).orElseThrow();
          return new CentralPolicyDtos.PolicyOrganizationOption(e.getId(), e.getCode(), e.getName(),
              e.getParentOrganizationId(), parent == null ? null : parent.getCode(),
              parent == null ? null : parent.getName(), e.getStatus(), e.getValidFrom(), e.getValidTo());
        }).filter(e -> matches(e.toString(), search))
        .sorted(Comparator.comparing(CentralPolicyDtos.PolicyOrganizationOption::organizationId)).toList();
  }
  private CentralPolicyDtos.PolicyOrganizationScopeResponse mapOrganization(CentralPolicyOrganizationScopeEntity row) {
    var organization = endpoints.findById(row.getOrganizationId()).orElseThrow();
    var parent = organization.getParentOrganizationId() == null ? null
        : endpoints.findById(organization.getParentOrganizationId()).orElseThrow();
    return mapper.response(row, organization, parent);
  }
  
  
  private boolean matches(String value, String search) {
    return search == null || search.isBlank() || value.toLowerCase(Locale.ROOT).contains(search.trim().toLowerCase(Locale.ROOT));
  }
  private void requirePolicy(UUID id) {
    if (policies.findByIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED).isEmpty()) throw missing(id);
  }
  private NotFoundException missing(UUID id) {
    return new NotFoundException("POLICY_RELATION_NOT_FOUND", "error.masterdata.v2.notFound", "Policy relation not found", id);
  }
  private void requireAccess() { if (!authorization.canView("GOVERNANCE") || !authorization.canView("REFERENCE")) throw new ForbiddenException("MASTER_DATA_ACCESS_DENIED", "error.security.forbidden", "Policy relation access denied"); }
}
