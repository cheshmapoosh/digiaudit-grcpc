package com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUser;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.entity.CentralAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.repository.CentralAccountGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.repository.CentralControlObjectiveRepository;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.domain.entity.CentralControlObjectiveAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.domain.repository.CentralControlObjectiveAccountGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.mapper.CentralControlAccountGroupMapper;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.domain.entity.CentralControlAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.domain.repository.CentralControlAccountGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.entity.CentralSubprocessControlScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.repository.CentralSubprocessControlScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.entity.CentralSubprocessControlObjectiveScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.repository.CentralSubprocessControlObjectiveScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CentralControlAccountGroupQueryService {
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;
  private final CentralControlAccountGroupRepository classifications;
  private final CentralControlRepository controls;
  private final CentralAccountGroupRepository accountGroups;
  private final CentralSubprocessRepository subprocesses;
  private final CentralSubprocessControlScopeRepository controlScopes;
  private final CentralControlObjectiveAccountGroupRepository controlObjectiveClassifications;
  private final CentralControlObjectiveRepository controlObjectives;
  private final CentralSubprocessControlObjectiveScopeRepository controlObjectiveScopes;
  private final CurrentUserProvider users;
  private final CentralControlAccountGroupMapper mapper;

  public CentralControlAccountGroupQueryService(CentralControlAccountGroupRepository classifications,
      CentralControlRepository controls, CentralAccountGroupRepository accountGroups,
      CentralSubprocessRepository subprocesses, CentralSubprocessControlScopeRepository controlScopes,
      CentralControlObjectiveAccountGroupRepository controlObjectiveClassifications,
      CentralControlObjectiveRepository controlObjectives,
      CentralSubprocessControlObjectiveScopeRepository controlObjectiveScopes,
      CurrentUserProvider users,
      CentralControlAccountGroupMapper mapper) {
    this.classifications = classifications; this.controls = controls; this.accountGroups = accountGroups;
    this.subprocesses = subprocesses; this.controlScopes = controlScopes; this.mapper = mapper;
    this.controlObjectiveClassifications = controlObjectiveClassifications;
    this.controlObjectives = controlObjectives;
    this.controlObjectiveScopes = controlObjectiveScopes;
    this.users = users;
  }

  @Transactional(readOnly = true)
  public List<CentralControlAccountGroupResponse> forControl(UUID controlId, boolean deleted) {
    CentralControlEntity control = requireControl(controlId);
    List<CentralControlAccountGroupEntity> rows = deleted
        ? classifications.findByControlIdAndStatus(controlId, DELETED)
        : classifications.findByControlIdAndStatusNot(controlId, DELETED);
    Map<UUID, CentralAccountGroupEntity> groups = indexGroups(rows);
    return rows.stream().map(r -> mapper.response(r, control, requireGroup(groups, r.getAccountGroupId())))
        .sorted(Comparator.comparing(CentralControlAccountGroupResponse::accountGroupCode).thenComparing(CentralControlAccountGroupResponse::classificationId)).toList();
  }

  @Transactional(readOnly = true)
  public List<CentralControlAccountGroupResponse> forAccountGroup(UUID accountGroupId) {
    CentralAccountGroupEntity group = accountGroups.findById(accountGroupId).orElseThrow(() -> endpointNotFound("Account Group", accountGroupId));
    List<CentralControlAccountGroupEntity> rows = classifications.findByAccountGroupIdAndStatusNot(accountGroupId, DELETED);
    Map<UUID, CentralControlEntity> byId = controls.findAllById(rows.stream().map(CentralControlAccountGroupEntity::getControlId).toList())
        .stream().collect(Collectors.toMap(CentralControlEntity::getId, Function.identity()));
    return rows.stream().map(r -> mapper.response(r, requireControl(byId, r.getControlId()), group))
        .sorted(Comparator.comparing(CentralControlAccountGroupResponse::controlCode).thenComparing(CentralControlAccountGroupResponse::classificationId)).toList();
  }

  @Transactional(readOnly = true)
  public CentralControlAccountGroupOptionsResponse options() {
    List<CentralAccountGroupEntity> all = accountGroups.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(DELETED);
    Map<UUID, OptionNode> nodes = new LinkedHashMap<>(); all.forEach(g -> nodes.put(g.getId(), new OptionNode(g)));
    List<OptionNode> roots = new ArrayList<>();
    for (CentralAccountGroupEntity group : all) { OptionNode node = nodes.get(group.getId()); OptionNode parent = nodes.get(group.getParentAccountGroupId()); if (parent == null) roots.add(node); else parent.children.add(node); }
    roots.sort(OptionNode.ORDER);
    return new CentralControlAccountGroupOptionsResponse(roots.stream().map(OptionNode::response).toList());
  }

  @Transactional(readOnly = true)
  public List<DerivedSubprocessAccountGroupResponse> forSubprocess(UUID subprocessId) {
    CentralSubprocessEntity subprocess = subprocesses.findById(subprocessId).orElseThrow(() -> endpointNotFound("Subprocess", subprocessId));
    if (subprocess.getStatus() == DELETED) throw endpointNotFound("Subprocess", subprocessId);
    boolean allowControlPath = hasAuthority("CENTRAL_CONTROL_SCOPE_VIEW")
        && hasAuthority("CENTRAL_CONTROL_ACCOUNT_GROUP_VIEW");
    boolean allowControlObjectivePath = hasAuthority("CENTRAL_CONTROL_OBJECTIVE_SCOPE_VIEW")
        && hasAuthority("CENTRAL_CONTROL_OBJECTIVE_ACCOUNT_GROUP_VIEW");

    Map<UUID, List<DerivedSubprocessAccountGroupResponse.ControlContribution>> controlContributions =
        allowControlPath ? controlContributions(subprocessId) : Map.of();
    Map<UUID, List<DerivedSubprocessAccountGroupResponse.ControlObjectiveContribution>>
        controlObjectiveContributions = allowControlObjectivePath
            ? controlObjectiveContributions(subprocessId) : Map.of();
    Set<UUID> accountGroupIds = new HashSet<>(controlContributions.keySet());
    accountGroupIds.addAll(controlObjectiveContributions.keySet());
    if (accountGroupIds.isEmpty()) return List.of();
    Map<UUID, CentralAccountGroupEntity> groupsById = accountGroups.findAllById(accountGroupIds)
        .stream().collect(Collectors.toMap(CentralAccountGroupEntity::getId, Function.identity()));

    return accountGroupIds.stream().map(accountGroupId -> {
      CentralAccountGroupEntity group = requireGroup(groupsById, accountGroupId);
      List<DerivedSubprocessAccountGroupResponse.ControlContribution> sortedControls =
          controlContributions.getOrDefault(accountGroupId, List.of()).stream()
              .sorted(Comparator.comparing(
                      DerivedSubprocessAccountGroupResponse.ControlContribution::controlCode)
                  .thenComparing(
                      DerivedSubprocessAccountGroupResponse.ControlContribution::classificationId))
              .toList();
      List<DerivedSubprocessAccountGroupResponse.ControlObjectiveContribution> sortedObjectives =
          controlObjectiveContributions.getOrDefault(accountGroupId, List.of()).stream()
              .sorted(Comparator.comparing(
                      DerivedSubprocessAccountGroupResponse.ControlObjectiveContribution::controlObjectiveCode)
                  .thenComparing(
                      DerivedSubprocessAccountGroupResponse.ControlObjectiveContribution::classificationId))
              .toList();
      return new DerivedSubprocessAccountGroupResponse(
          group.getId(), group.getCode(), group.getTitle(), group.getParentAccountGroupId(),
          group.getStatus(), sortedControls, sortedObjectives);
    }).sorted(Comparator.comparing(DerivedSubprocessAccountGroupResponse::accountGroupCode)
        .thenComparing(DerivedSubprocessAccountGroupResponse::accountGroupId)).toList();
  }

  private Map<UUID, List<DerivedSubprocessAccountGroupResponse.ControlContribution>>
      controlContributions(UUID subprocessId) {
    List<CentralSubprocessControlScopeEntity> scopes =
        controlScopes.findBySubprocessIdAndStatusNot(subprocessId, DELETED);
    if (scopes.isEmpty()) return Map.of();
    List<UUID> controlIds = scopes.stream()
        .map(CentralSubprocessControlScopeEntity::getControlId).distinct().toList();
    List<CentralControlAccountGroupEntity> rows =
        classifications.findByControlIdInAndStatusNot(controlIds, DELETED);
    if (rows.isEmpty()) return Map.of();
    Map<UUID, CentralControlEntity> controlsById = controls.findAllById(controlIds).stream()
        .collect(Collectors.toMap(CentralControlEntity::getId, Function.identity()));
    Map<UUID, CentralSubprocessControlScopeEntity> scopesByControl = scopes.stream()
        .collect(Collectors.toMap(
            CentralSubprocessControlScopeEntity::getControlId, Function.identity(), (a, b) -> a));
    Map<UUID, List<DerivedSubprocessAccountGroupResponse.ControlContribution>> result =
        new LinkedHashMap<>();
    for (CentralControlAccountGroupEntity row : rows) {
      CentralControlEntity control = requireControl(controlsById, row.getControlId());
      CentralSubprocessControlScopeEntity scope = scopesByControl.get(row.getControlId());
      if (scope == null) continue;
      result.computeIfAbsent(row.getAccountGroupId(), ignored -> new ArrayList<>()).add(
          new DerivedSubprocessAccountGroupResponse.ControlContribution(
              control.getId(), control.getCode(), control.getTitle(), scope.getId(),
              scope.getStatus(), row.getId(), row.getStatus()));
    }
    return result;
  }

  private Map<UUID, List<DerivedSubprocessAccountGroupResponse.ControlObjectiveContribution>>
      controlObjectiveContributions(UUID subprocessId) {
    List<CentralSubprocessControlObjectiveScopeEntity> scopes =
        controlObjectiveScopes.findBySubprocessIdAndStatusNot(subprocessId, DELETED);
    if (scopes.isEmpty()) return Map.of();
    List<UUID> objectiveIds = scopes.stream()
        .map(CentralSubprocessControlObjectiveScopeEntity::getControlObjectiveId)
        .distinct().toList();
    List<CentralControlObjectiveAccountGroupEntity> rows = controlObjectiveClassifications
        .findByControlObjectiveIdInAndStatusNot(objectiveIds, DELETED);
    if (rows.isEmpty()) return Map.of();
    Map<UUID, CentralControlObjectiveEntity> objectivesById = controlObjectives
        .findAllById(objectiveIds).stream()
        .collect(Collectors.toMap(CentralControlObjectiveEntity::getId, Function.identity()));
    Map<UUID, CentralSubprocessControlObjectiveScopeEntity> scopesByObjective = scopes.stream()
        .collect(Collectors.toMap(
            CentralSubprocessControlObjectiveScopeEntity::getControlObjectiveId,
            Function.identity(), (a, b) -> a));
    Map<UUID, List<DerivedSubprocessAccountGroupResponse.ControlObjectiveContribution>> result =
        new LinkedHashMap<>();
    for (CentralControlObjectiveAccountGroupEntity row : rows) {
      CentralControlObjectiveEntity objective = objectivesById.get(row.getControlObjectiveId());
      if (objective == null) throw endpointNotFound("Control Objective", row.getControlObjectiveId());
      CentralSubprocessControlObjectiveScopeEntity scope =
          scopesByObjective.get(row.getControlObjectiveId());
      if (scope == null) continue;
      result.computeIfAbsent(row.getAccountGroupId(), ignored -> new ArrayList<>()).add(
          new DerivedSubprocessAccountGroupResponse.ControlObjectiveContribution(
              objective.getId(), objective.getCode(), objective.getTitle(),
              objective.getObjectiveClass(), scope.getId(), scope.getStatus(),
              row.getId(), row.getStatus()));
    }
    return result;
  }

  private boolean hasAuthority(String authority) {
    CurrentUser user = users.getCurrentPrincipal();
    return user.isRootUser() || user.getAuthorities().stream().anyMatch(granted ->
        granted.getAuthority().equals("ROLE_ROOT_ADMIN")
            || granted.getAuthority().equals(authority));
  }

  private Map<UUID, CentralAccountGroupEntity> indexGroups(List<CentralControlAccountGroupEntity> rows) { return accountGroups.findAllById(rows.stream().map(CentralControlAccountGroupEntity::getAccountGroupId).distinct().toList()).stream().collect(Collectors.toMap(CentralAccountGroupEntity::getId, Function.identity())); }
  private CentralControlEntity requireControl(UUID id) { return controls.findById(id).orElseThrow(() -> endpointNotFound("Control", id)); }
  private CentralControlEntity requireControl(Map<UUID, CentralControlEntity> values, UUID id) { CentralControlEntity value = values.get(id); if (value == null) throw endpointNotFound("Control", id); return value; }
  private CentralAccountGroupEntity requireGroup(Map<UUID, CentralAccountGroupEntity> values, UUID id) { CentralAccountGroupEntity value = values.get(id); if (value == null) throw endpointNotFound("Account Group", id); return value; }
  private NotFoundException endpointNotFound(String type, UUID id) { return new NotFoundException("CONTROL_ACCOUNT_GROUP_ENDPOINT_NOT_FOUND", "error.masterdata.controlAccountGroup.endpointNotFound", type + " endpoint not found", id); }

  private static final class OptionNode {
    static final Comparator<OptionNode> ORDER = Comparator.comparingInt((OptionNode n) -> n.group.getSortOrder()).thenComparing(n -> n.group.getTitle(), String.CASE_INSENSITIVE_ORDER).thenComparing(n -> n.group.getId());
    final CentralAccountGroupEntity group; final List<OptionNode> children = new ArrayList<>(); OptionNode(CentralAccountGroupEntity group) { this.group = group; }
    CentralControlAccountGroupOptionsResponse.AccountGroupOption response() { children.sort(ORDER); return new CentralControlAccountGroupOptionsResponse.AccountGroupOption(group.getId(), group.getCode(), group.getTitle(), group.getParentAccountGroupId(), group.getSortOrder(), group.getStatus(), children.stream().map(OptionNode::response).toList()); }
  }
}
