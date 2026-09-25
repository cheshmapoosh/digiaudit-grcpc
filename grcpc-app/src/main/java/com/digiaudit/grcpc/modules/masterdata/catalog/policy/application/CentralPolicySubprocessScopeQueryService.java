package com.digiaudit.grcpc.modules.masterdata.catalog.policy.application;

import com.digiaudit.grcpc.common.exception.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.mapper.CentralPolicySubprocessScopeMapper;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicySubprocessScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository.CentralPolicySubprocessScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository.CentralPolicyRepository;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralProcessRepository;

import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CentralPolicySubprocessScopeQueryService {
  private final CentralPolicySubprocessScopeRepository relations;
  private final CentralSubprocessRepository endpoints;
  private final CentralProcessRepository processes;
  
  private final CentralPolicyRepository policies;
  private final CentralPolicySubprocessScopeMapper mapper;
  private final MasterDataAuthorizationService authorization;
  public CentralPolicySubprocessScopeQueryService(CentralPolicySubprocessScopeRepository relations, CentralSubprocessRepository endpoints,
      CentralProcessRepository processes,
      CentralPolicyRepository policies, CentralPolicySubprocessScopeMapper mapper, MasterDataAuthorizationService authorization) {
    this.relations = relations; this.endpoints = endpoints;
    this.processes = processes;
    
    this.policies = policies; this.mapper = mapper; this.authorization = authorization;
  }
  @Transactional(readOnly = true)
  public List<CentralPolicyDtos.PolicySubprocessScopeResponse> list(UUID policyId,
      MasterDataLifecycleStatus status, String search) {
    requireAccess();
    if (status == MasterDataLifecycleStatus.DELETED)
      throw new UnprocessableEntityException("INVALID_LIFECYCLE_FILTER", "error.masterdata.v2.invalidLifecycleFilter", "Use the deleted read");
    requirePolicy(policyId);
    var rows = status == null
        ? relations.findByPolicyIdAndStatusNot(policyId, MasterDataLifecycleStatus.DELETED)
        : relations.findByPolicyIdAndStatus(policyId, status);
    return rows.stream().map(this::mapSubprocess)
        .filter(row -> matches(row.toString(), search))
        .sorted(Comparator.comparing(CentralPolicyDtos.PolicySubprocessScopeResponse::id)).toList();
  }
  @Transactional(readOnly = true)
  public List<CentralPolicyDtos.PolicySubprocessScopeResponse> deleted(UUID policyId, String search) {
    requireAccess(); requirePolicy(policyId);
    return relations.findByPolicyIdAndStatus(policyId, MasterDataLifecycleStatus.DELETED).stream()
        .map(this::mapSubprocess).filter(row -> matches(row.toString(), search))
        .sorted(Comparator.comparing(CentralPolicyDtos.PolicySubprocessScopeResponse::id)).toList();
  }
  @Transactional(readOnly = true)
  public CentralPolicyDtos.PolicySubprocessScopeResponse detail(UUID policyId, UUID relationId) {
    requireAccess(); requirePolicy(policyId);
    var row = relations.findById(relationId).orElseThrow(() -> missing(relationId));
    if (!row.getPolicyId().equals(policyId) || row.getStatus() == MasterDataLifecycleStatus.DELETED)
      throw missing(relationId);
    return mapSubprocess(row);
  }
  @Transactional(readOnly = true)
  public List<CentralPolicyDtos.PolicySubprocessOption> options(String search) {
    requireAccess();
    return endpoints.findAll().stream().filter(e -> {
          var process = processes.findById(e.getProcessId()).orElseThrow();
          return e.getStatus() == MasterDataLifecycleStatus.ACTIVE
              && process.getStatus() == MasterDataLifecycleStatus.ACTIVE
              && subset(e.getValidFrom(), e.getValidTo(), process.getValidFrom(), process.getValidTo());
        })
        .map(e -> {
          var process = processes.findById(e.getProcessId()).orElseThrow();
          return new CentralPolicyDtos.PolicySubprocessOption(e.getId(), e.getCode(), e.getTitle(),
              e.getProcessId(), process.getCode(), process.getTitle(), e.getStatus(), e.getValidFrom(), e.getValidTo());
        }).filter(e -> matches(e.toString(), search))
        .sorted(Comparator.comparing(CentralPolicyDtos.PolicySubprocessOption::subprocessId)).toList();
  }
  private CentralPolicyDtos.PolicySubprocessScopeResponse mapSubprocess(CentralPolicySubprocessScopeEntity row) {
    var subprocess = endpoints.findById(row.getSubprocessId()).orElseThrow();
    return mapper.response(row, subprocess, processes.findById(subprocess.getProcessId()).orElseThrow());
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
