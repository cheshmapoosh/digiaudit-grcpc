package com.digiaudit.grcpc.modules.masterdata.catalog.policy.application;

import com.digiaudit.grcpc.common.exception.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.mapper.CentralPolicyRequirementScopeMapper;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyRequirementScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository.CentralPolicyRequirementScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository.CentralPolicyRepository;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.repository.CentralSubprocessRequirementScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRequirementRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRepository;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CentralPolicyRequirementScopeQueryService {
  private final CentralPolicyRequirementScopeRepository relations;
  private final CentralSubprocessRequirementScopeRepository endpoints;
  private final CentralSubprocessRepository subprocesses;
  private final CentralRegulationRequirementRepository requirements;
  private final CentralRegulationRepository regulations;
  private final CentralPolicyRepository policies;
  private final CentralPolicyRequirementScopeMapper mapper;
  private final MasterDataAuthorizationService authorization;
  public CentralPolicyRequirementScopeQueryService(CentralPolicyRequirementScopeRepository relations, CentralSubprocessRequirementScopeRepository endpoints, CentralSubprocessRepository subprocesses, CentralRegulationRequirementRepository requirements, CentralRegulationRepository regulations,
      CentralPolicyRepository policies, CentralPolicyRequirementScopeMapper mapper, MasterDataAuthorizationService authorization) {
    this.relations = relations; this.endpoints = endpoints;
    this.subprocesses = subprocesses; this.requirements = requirements; this.regulations = regulations;
    this.policies = policies; this.mapper = mapper; this.authorization = authorization;
  }
  @Transactional(readOnly = true)
  public List<CentralPolicyDtos.PolicyRequirementScopeResponse> list(UUID policyId,
      MasterDataLifecycleStatus status, String search) {
    requireAccess();
    if (status == MasterDataLifecycleStatus.DELETED)
      throw new UnprocessableEntityException("INVALID_LIFECYCLE_FILTER", "error.masterdata.v2.invalidLifecycleFilter", "Use the deleted read");
    requirePolicy(policyId);
    var rows = status == null
        ? relations.findByPolicyIdAndStatusNot(policyId, MasterDataLifecycleStatus.DELETED)
        : relations.findByPolicyIdAndStatus(policyId, status);
    return rows.stream().map(row -> mapRequirement(row))
        .filter(row -> matches(row.toString(), search))
        .sorted(Comparator.comparing(CentralPolicyDtos.PolicyRequirementScopeResponse::id)).toList();
  }
  @Transactional(readOnly = true)
  public List<CentralPolicyDtos.PolicyRequirementScopeResponse> deleted(UUID policyId, String search) {
    requireAccess(); requirePolicy(policyId);
    return relations.findByPolicyIdAndStatus(policyId, MasterDataLifecycleStatus.DELETED).stream()
        .map(row -> mapRequirement(row)).filter(row -> matches(row.toString(), search))
        .sorted(Comparator.comparing(CentralPolicyDtos.PolicyRequirementScopeResponse::id)).toList();
  }
  @Transactional(readOnly = true)
  public CentralPolicyDtos.PolicyRequirementScopeResponse detail(UUID policyId, UUID relationId) {
    requireAccess(); requirePolicy(policyId);
    var row = relations.findById(relationId).orElseThrow(() -> missing(relationId));
    if (!row.getPolicyId().equals(policyId) || row.getStatus() == MasterDataLifecycleStatus.DELETED)
      throw missing(relationId);
    return mapRequirement(row);
  }
  @Transactional(readOnly = true)
  public List<CentralPolicyDtos.PolicyRequirementOption> options(String search) {
    requireAccess();
    return endpoints.findAll().stream().filter(e -> {
          var subprocess = subprocesses.findById(e.getSubprocessId()).orElseThrow();
          var requirement = requirements.findById(e.getRequirementId()).orElseThrow();
          return e.getStatus() == MasterDataLifecycleStatus.ACTIVE
              && subprocess.getStatus() == MasterDataLifecycleStatus.ACTIVE
              && requirement.getStatus() == MasterDataLifecycleStatus.ACTIVE
              && subset(e.getValidFrom(), e.getValidTo(), subprocess.getValidFrom(), subprocess.getValidTo())
              && subset(e.getValidFrom(), e.getValidTo(), requirement.getValidFrom(), requirement.getValidTo());
        })
        .map(e -> optionRequirement(e)).filter(e -> matches(e.toString(), search))
        .sorted(Comparator.comparing(CentralPolicyDtos.PolicyRequirementOption::centralRequirementScopeId)).toList();
  }
  private CentralPolicyDtos.PolicyRequirementScopeResponse mapRequirement(CentralPolicyRequirementScopeEntity row) {
    var scope = endpoints.findById(row.getCentralRequirementScopeId()).orElseThrow();
    var requirement = requirements.findById(scope.getRequirementId()).orElseThrow();
    return mapper.response(row, scope, subprocesses.findById(scope.getSubprocessId()).orElseThrow(),
        requirement, regulations.findById(requirement.getRegulationId()).orElseThrow());
  }
  private CentralPolicyDtos.PolicyRequirementOption optionRequirement(com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.entity.CentralSubprocessRequirementScopeEntity e) {
    var sp = subprocesses.findById(e.getSubprocessId()).orElseThrow();
    var requirement = requirements.findById(e.getRequirementId()).orElseThrow();
    var regulation = regulations.findById(requirement.getRegulationId()).orElseThrow();
    return new CentralPolicyDtos.PolicyRequirementOption(e.getId(), sp.getId(), sp.getCode(), sp.getTitle(), requirement.getId(), requirement.getCode(), requirement.getTitle(),
        regulation.getCode(), regulation.getTitle(), e.getStatus(), e.getValidFrom(), e.getValidTo());
  }
  private boolean subset(java.time.LocalDate from, java.time.LocalDate to,
      java.time.LocalDate parentFrom, java.time.LocalDate parentTo) {
    return (parentFrom == null || (from != null && !from.isBefore(parentFrom)))
        && (parentTo == null || (to != null && !to.isAfter(parentTo)));
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
  private void requireAccess() { if (!authorization.canView("GOVERNANCE") || !authorization.canView("PROCESS")) throw new ForbiddenException("MASTER_DATA_ACCESS_DENIED", "error.security.forbidden", "Policy relation access denied"); }
}
