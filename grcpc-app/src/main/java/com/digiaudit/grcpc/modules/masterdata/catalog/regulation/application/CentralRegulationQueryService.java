package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.CentralRegulationDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.mapper.CentralRegulationMapper;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.*;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CentralRegulationQueryService {
  private final CentralRegulationGroupRepository groups;
  private final CentralRegulationRepository regulations;
  private final CentralRegulationRequirementRepository requirements;
  private final CentralRegulationMapper mapper;

  public CentralRegulationQueryService(
      CentralRegulationGroupRepository groups,
      CentralRegulationRepository regulations,
      CentralRegulationRequirementRepository requirements,
      CentralRegulationMapper mapper) {
    this.groups = groups;
    this.regulations = regulations;
    this.requirements = requirements;
    this.mapper = mapper;
  }

  @Transactional(readOnly = true)
  public List<CentralRegulationDtos.GroupSummary> groups() {
    return groups
        .findByStatusNotOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus.DELETED)
        .stream()
        .map(mapper::summary)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<CentralRegulationDtos.GroupSummary> deletedGroups() {
    return groups
        .findByStatusOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus.DELETED)
        .stream()
        .map(mapper::summary)
        .toList();
  }

  @Transactional(readOnly = true)
  public CentralRegulationDtos.GroupDetail group(UUID id) {
    return groups
        .findByIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED)
        .map(mapper::detail)
        .orElseThrow(() -> notFound("Regulation Group", id));
  }

  @Transactional(readOnly = true)
  public List<CentralRegulationDtos.GroupTree> tree() {
    var rows =
        groups.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus.DELETED);
    Map<UUID, Node> nodes = new HashMap<>();
    rows.forEach(e -> nodes.put(e.getId(), new Node(e)));
    List<Node> roots = new ArrayList<>();
    for (var e : rows) {
      Node n = nodes.get(e.getId()), p = nodes.get(e.getParentGroupId());
      if (p == null) roots.add(n);
      else p.children.add(n);
    }
    roots.sort(Node.ORDER);
    return roots.stream().map(Node::response).toList();
  }

  @Transactional(readOnly = true)
  public List<CentralRegulationDtos.RegulationSummary> regulations(UUID groupId) {
    var rows =
        groupId == null
            ? regulations.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(
                MasterDataLifecycleStatus.DELETED)
            : regulations.findByRegulationGroupIdAndStatusNotOrderBySortOrderAscTitleAscIdAsc(
                groupId, MasterDataLifecycleStatus.DELETED);
    return rows.stream().map(mapper::summary).toList();
  }

  @Transactional(readOnly = true)
  public List<CentralRegulationDtos.RegulationSummary> deletedRegulations() {
    return regulations
        .findByStatusOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus.DELETED)
        .stream()
        .map(mapper::summary)
        .toList();
  }

  @Transactional(readOnly = true)
  public CentralRegulationDtos.RegulationDetail regulation(UUID id) {
    return regulations
        .findByIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED)
        .map(mapper::detail)
        .orElseThrow(() -> notFound("Regulation", id));
  }

  @Transactional(readOnly = true)
  public List<CentralRegulationDtos.RequirementSummary> requirements(UUID regulationId) {
    var rows =
        regulationId == null
            ? requirements.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(
                MasterDataLifecycleStatus.DELETED)
            : requirements.findByRegulationIdAndStatusNotOrderBySortOrderAscTitleAscIdAsc(
                regulationId, MasterDataLifecycleStatus.DELETED);
    return rows.stream().map(mapper::summary).toList();
  }

  @Transactional(readOnly = true)
  public List<CentralRegulationDtos.RequirementSummary> deletedRequirements() {
    return requirements
        .findByStatusOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus.DELETED)
        .stream()
        .map(mapper::summary)
        .toList();
  }

  @Transactional(readOnly = true)
  public CentralRegulationDtos.RequirementDetail requirement(UUID id) {
    return requirements
        .findByIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED)
        .map(mapper::detail)
        .orElseThrow(() -> notFound("Regulation Requirement", id));
  }

  private NotFoundException notFound(String type, UUID id) {
    return new NotFoundException(
        "MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound", type + " not found", id);
  }

  private static final class Node {
    static final Comparator<Node> ORDER =
        Comparator.comparingInt((Node n) -> n.e.getSortOrder())
            .thenComparing(n -> n.e.getTitle(), String.CASE_INSENSITIVE_ORDER)
            .thenComparing(n -> n.e.getId());
    final CentralRegulationGroupEntity e;
    final List<Node> children = new ArrayList<>();

    Node(CentralRegulationGroupEntity e) {
      this.e = e;
    }

    CentralRegulationDtos.GroupTree response() {
      children.sort(ORDER);
      return new CentralRegulationDtos.GroupTree(
          e.getId(),
          e.getCode(),
          e.getTitle(),
          e.getParentGroupId(),
          e.getSortOrder(),
          e.getStatus(),
          e.getVersion(),
          children.stream().map(Node::response).toList());
    }
  }
}
