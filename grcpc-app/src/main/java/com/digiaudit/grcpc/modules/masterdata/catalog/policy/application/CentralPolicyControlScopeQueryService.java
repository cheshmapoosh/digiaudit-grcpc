package com.digiaudit.grcpc.modules.masterdata.catalog.policy.application;

import com.digiaudit.grcpc.common.exception.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.mapper.CentralPolicyControlScopeMapper;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyControlScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository.CentralPolicyControlScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository.CentralPolicyRepository;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.repository.CentralSubprocessControlScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlGroupRepository;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CentralPolicyControlScopeQueryService {
  private final CentralPolicyControlScopeRepository relations;
  private final CentralSubprocessControlScopeRepository endpoints;
  private final CentralSubprocessRepository subprocesses;
  private final CentralControlRepository controls;
  private final CentralControlGroupRepository groups;
  private final CentralPolicyRepository policies;
  private final CentralPolicyControlScopeMapper mapper;
  private final MasterDataAuthorizationService authorization;
  public CentralPolicyControlScopeQueryService(CentralPolicyControlScopeRepository relations, CentralSubprocessControlScopeRepository endpoints, CentralSubprocessRepository subprocesses, CentralControlRepository controls, CentralControlGroupRepository groups,
      CentralPolicyRepository policies, CentralPolicyControlScopeMapper mapper, MasterDataAuthorizationService authorization) {
    this.relations = relations; this.endpoints = endpoints;
    this.subprocesses = subprocesses; this.controls = controls; this.groups = groups;
    this.policies = policies; this.mapper = mapper; this.authorization = authorization;
  }
  @Transactional(readOnly = true)
  public List<CentralPolicyDtos.PolicyControlScopeResponse> list(UUID policyId,
      MasterDataLifecycleStatus status, String search) {
    requireAccess();
    if (status == MasterDataLifecycleStatus.DELETED)
      throw new UnprocessableEntityException("INVALID_LIFECYCLE_FILTER", "error.masterdata.v2.invalidLifecycleFilter", "Use the deleted read");
    requirePolicy(policyId);
    var rows = status == null
        ? relations.findByPolicyIdAndStatusNot(policyId, MasterDataLifecycleStatus.DELETED)
        : relations.findByPolicyIdAndStatus(policyId, status);
    return rows.stream().map(row -> mapControl(row))
        .filter(row -> matches(row.toString(), search))
        .sorted(Comparator.comparing(CentralPolicyDtos.PolicyControlScopeResponse::id)).toList();
  }
  @Transactional(readOnly = true)
  public List<CentralPolicyDtos.PolicyControlScopeResponse> deleted(UUID policyId, String search) {
    requireAccess(); requirePolicy(policyId);
    return relations.findByPolicyIdAndStatus(policyId, MasterDataLifecycleStatus.DELETED).stream()
        .map(row -> mapControl(row)).filter(row -> matches(row.toString(), search))
        .sorted(Comparator.comparing(CentralPolicyDtos.PolicyControlScopeResponse::id)).toList();
  }
  @Transactional(readOnly = true)
  public CentralPolicyDtos.PolicyControlScopeResponse detail(UUID policyId, UUID relationId) {
    requireAccess(); requirePolicy(policyId);
    var row = relations.findById(relationId).orElseThrow(() -> missing(relationId));
    if (!row.getPolicyId().equals(policyId) || row.getStatus() == MasterDataLifecycleStatus.DELETED)
      throw missing(relationId);
    return mapControl(row);
  }
  @Transactional(readOnly = true)
  public List<CentralPolicyDtos.PolicyControlOption> options(String search) {
    requireAccess();
    return endpoints.findAll().stream().filter(e -> {
          var subprocess = subprocesses.findById(e.getSubprocessId()).orElseThrow();
          var control = controls.findById(e.getControlId()).orElseThrow();
          return e.getStatus() == MasterDataLifecycleStatus.ACTIVE
              && subprocess.getStatus() == MasterDataLifecycleStatus.ACTIVE
              && control.getStatus() == MasterDataLifecycleStatus.ACTIVE
              && subset(e.getValidFrom(), e.getValidTo(), subprocess.getValidFrom(), subprocess.getValidTo())
              && subset(e.getValidFrom(), e.getValidTo(), control.getValidFrom(), control.getValidTo());
        })
        .map(e -> optionControl(e)).filter(e -> matches(e.toString(), search))
        .sorted(Comparator.comparing(CentralPolicyDtos.PolicyControlOption::centralControlScopeId)).toList();
  }
  private CentralPolicyDtos.PolicyControlScopeResponse mapControl(CentralPolicyControlScopeEntity row) {
    var scope = endpoints.findById(row.getCentralControlScopeId()).orElseThrow();
    var control = controls.findById(scope.getControlId()).orElseThrow();
    var group = control.getControlGroupId() == null ? null : groups.findById(control.getControlGroupId()).orElseThrow();
    return mapper.response(row, scope, subprocesses.findById(scope.getSubprocessId()).orElseThrow(), control, group);
  }
  private CentralPolicyDtos.PolicyControlOption optionControl(com.digiaudit.grcpc.modules.masterdata.scope.control.domain.entity.CentralSubprocessControlScopeEntity e) {
    var sp = subprocesses.findById(e.getSubprocessId()).orElseThrow();
    var control = controls.findById(e.getControlId()).orElseThrow();
    var group = control.getControlGroupId() == null ? null : groups.findById(control.getControlGroupId()).orElseThrow();
    return new CentralPolicyDtos.PolicyControlOption(e.getId(), sp.getId(), sp.getCode(), sp.getTitle(), control.getId(), control.getCode(), control.getTitle(),
        group == null ? null : group.getCode(), group == null ? null : group.getTitle(), e.getStatus(), e.getValidFrom(), e.getValidTo());
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
  private void requireAccess() { if (!authorization.canView("GOVERNANCE") || !authorization.canView("PROCESS") || !authorization.canView("CONTROL")) throw new ForbiddenException("MASTER_DATA_ACCESS_DENIED", "error.security.forbidden", "Policy relation access denied"); }
}
