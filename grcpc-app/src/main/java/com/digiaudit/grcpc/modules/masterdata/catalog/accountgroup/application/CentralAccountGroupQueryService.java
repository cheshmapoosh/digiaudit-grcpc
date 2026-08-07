package com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.api.dto.CentralAccountGroupDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.api.mapper.CentralAccountGroupMapper;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.entity.CentralAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.repository.CentralAccountGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CentralAccountGroupQueryService {
  private final CentralAccountGroupRepository repository;
  private final CentralAccountGroupMapper mapper;

  public CentralAccountGroupQueryService(
      CentralAccountGroupRepository repository, CentralAccountGroupMapper mapper) {
    this.repository = repository;
    this.mapper = mapper;
  }

  @Transactional(readOnly = true)
  public List<CentralAccountGroupDtos.Summary> list() {
    return repository
        .findByStatusNotOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus.DELETED)
        .stream()
        .map(mapper::summary)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<CentralAccountGroupDtos.Summary> deleted() {
    return repository
        .findByStatusOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus.DELETED)
        .stream()
        .map(mapper::summary)
        .toList();
  }

  @Transactional(readOnly = true)
  public CentralAccountGroupDtos.Detail detail(UUID id) {
    return repository
        .findByIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED)
        .map(mapper::detail)
        .orElseThrow(() -> notFound(id));
  }

  @Transactional(readOnly = true)
  public List<CentralAccountGroupDtos.Tree> tree() {
    var entities =
        repository.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(
            MasterDataLifecycleStatus.DELETED);
    Map<UUID, Node> nodes = new HashMap<>();
    entities.forEach(e -> nodes.put(e.getId(), new Node(e)));
    List<Node> roots = new ArrayList<>();
    for (var e : entities) {
      Node n = nodes.get(e.getId());
      Node p = nodes.get(e.getParentAccountGroupId());
      if (p == null) roots.add(n);
      else p.children.add(n);
    }
    roots.sort(Node.ORDER);
    return roots.stream().map(Node::response).toList();
  }

  private NotFoundException notFound(UUID id) {
    return new NotFoundException(
        "MASTER_DATA_NOT_FOUND",
        "error.masterdata.v2.notFound",
        "Central Account Group not found",
        id);
  }

  private static final class Node {
    static final Comparator<Node> ORDER =
        Comparator.comparingInt((Node n) -> n.entity.getSortOrder())
            .thenComparing(n -> n.entity.getTitle(), String.CASE_INSENSITIVE_ORDER)
            .thenComparing(n -> n.entity.getId());
    final CentralAccountGroupEntity entity;
    final List<Node> children = new ArrayList<>();

    Node(CentralAccountGroupEntity entity) {
      this.entity = entity;
    }

    CentralAccountGroupDtos.Tree response() {
      children.sort(ORDER);
      return new CentralAccountGroupDtos.Tree(
          entity.getId(),
          entity.getCode(),
          entity.getTitle(),
          entity.getParentAccountGroupId(),
          entity.getSortOrder(),
          entity.getStatus(),
          entity.getVersion(),
          children.stream().map(Node::response).toList());
    }
  }
}
