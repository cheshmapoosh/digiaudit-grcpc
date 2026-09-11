package com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.entity.CentralAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.repository.CentralAccountGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.repository.CentralControlObjectiveRepository;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto.CentralControlObjectiveAccountGroupOptionsResponse;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto.CentralControlObjectiveAccountGroupResponse;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.mapper.CentralControlObjectiveAccountGroupMapper;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.domain.entity.CentralControlObjectiveAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.domain.repository.CentralControlObjectiveAccountGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CentralControlObjectiveAccountGroupQueryService {
  private static final MasterDataLifecycleStatus DELETED = MasterDataLifecycleStatus.DELETED;

  private final CentralControlObjectiveAccountGroupRepository classifications;
  private final CentralControlObjectiveRepository controlObjectives;
  private final CentralAccountGroupRepository accountGroups;
  private final CentralControlObjectiveAccountGroupMapper mapper;

  public CentralControlObjectiveAccountGroupQueryService(
      CentralControlObjectiveAccountGroupRepository classifications,
      CentralControlObjectiveRepository controlObjectives,
      CentralAccountGroupRepository accountGroups,
      CentralControlObjectiveAccountGroupMapper mapper) {
    this.classifications = classifications;
    this.controlObjectives = controlObjectives;
    this.accountGroups = accountGroups;
    this.mapper = mapper;
  }

  @Transactional(readOnly = true)
  public List<CentralControlObjectiveAccountGroupResponse> forControlObjective(
      UUID controlObjectiveId, boolean deleted) {
    CentralControlObjectiveEntity controlObjective = requireControlObjective(controlObjectiveId);
    List<CentralControlObjectiveAccountGroupEntity> rows = deleted
        ? classifications.findByControlObjectiveIdAndStatus(controlObjectiveId, DELETED)
        : classifications.findByControlObjectiveIdAndStatusNot(controlObjectiveId, DELETED);
    Map<UUID, CentralAccountGroupEntity> groups = indexGroups(rows);
    return rows.stream()
        .map(row -> mapper.response(
            row, controlObjective, requireGroup(groups, row.getAccountGroupId())))
        .sorted(Comparator.comparing(CentralControlObjectiveAccountGroupResponse::accountGroupCode)
            .thenComparing(CentralControlObjectiveAccountGroupResponse::classificationId))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<CentralControlObjectiveAccountGroupResponse> forAccountGroup(UUID accountGroupId) {
    CentralAccountGroupEntity group = accountGroups.findById(accountGroupId)
        .orElseThrow(() -> endpointNotFound("Account Group", accountGroupId));
    List<CentralControlObjectiveAccountGroupEntity> rows =
        classifications.findByAccountGroupIdAndStatusNot(accountGroupId, DELETED);
    Map<UUID, CentralControlObjectiveEntity> byId = controlObjectives.findAllById(
            rows.stream().map(CentralControlObjectiveAccountGroupEntity::getControlObjectiveId).toList())
        .stream().collect(Collectors.toMap(CentralControlObjectiveEntity::getId, Function.identity()));
    return rows.stream()
        .map(row -> mapper.response(
            row, requireControlObjective(byId, row.getControlObjectiveId()), group))
        .sorted(Comparator.comparing(
                CentralControlObjectiveAccountGroupResponse::controlObjectiveCode)
            .thenComparing(CentralControlObjectiveAccountGroupResponse::classificationId))
        .toList();
  }

  @Transactional(readOnly = true)
  public CentralControlObjectiveAccountGroupOptionsResponse options() {
    List<CentralAccountGroupEntity> all =
        accountGroups.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(DELETED);
    Map<UUID, OptionNode> nodes = new LinkedHashMap<>();
    all.forEach(group -> nodes.put(group.getId(), new OptionNode(group)));
    List<OptionNode> roots = new ArrayList<>();
    for (CentralAccountGroupEntity group : all) {
      OptionNode node = nodes.get(group.getId());
      OptionNode parent = nodes.get(group.getParentAccountGroupId());
      if (parent == null) roots.add(node);
      else parent.children.add(node);
    }
    roots.sort(OptionNode.ORDER);
    return new CentralControlObjectiveAccountGroupOptionsResponse(
        roots.stream().map(OptionNode::response).toList());
  }

  private Map<UUID, CentralAccountGroupEntity> indexGroups(
      List<CentralControlObjectiveAccountGroupEntity> rows) {
    return accountGroups.findAllById(rows.stream()
            .map(CentralControlObjectiveAccountGroupEntity::getAccountGroupId).distinct().toList())
        .stream().collect(Collectors.toMap(CentralAccountGroupEntity::getId, Function.identity()));
  }

  private CentralControlObjectiveEntity requireControlObjective(UUID id) {
    return controlObjectives.findById(id)
        .orElseThrow(() -> endpointNotFound("Control Objective", id));
  }

  private CentralControlObjectiveEntity requireControlObjective(
      Map<UUID, CentralControlObjectiveEntity> values, UUID id) {
    CentralControlObjectiveEntity value = values.get(id);
    if (value == null) throw endpointNotFound("Control Objective", id);
    return value;
  }

  private CentralAccountGroupEntity requireGroup(
      Map<UUID, CentralAccountGroupEntity> values, UUID id) {
    CentralAccountGroupEntity value = values.get(id);
    if (value == null) throw endpointNotFound("Account Group", id);
    return value;
  }

  private NotFoundException endpointNotFound(String type, UUID id) {
    return new NotFoundException(
        "CONTROL_OBJECTIVE_ACCOUNT_GROUP_ENDPOINT_NOT_FOUND",
        "error.masterdata.controlObjectiveAccountGroup.endpointNotFound",
        type + " endpoint not found", id);
  }

  private static final class OptionNode {
    static final Comparator<OptionNode> ORDER = Comparator
        .comparingInt((OptionNode node) -> node.group.getSortOrder())
        .thenComparing(node -> node.group.getTitle(), String.CASE_INSENSITIVE_ORDER)
        .thenComparing(node -> node.group.getId());
    final CentralAccountGroupEntity group;
    final List<OptionNode> children = new ArrayList<>();

    OptionNode(CentralAccountGroupEntity group) { this.group = group; }

    CentralControlObjectiveAccountGroupOptionsResponse.AccountGroupOption response() {
      children.sort(ORDER);
      return new CentralControlObjectiveAccountGroupOptionsResponse.AccountGroupOption(
          group.getId(), group.getCode(), group.getTitle(), group.getParentAccountGroupId(),
          group.getSortOrder(), group.getStatus(), children.stream().map(OptionNode::response).toList());
    }
  }
}
