package com.digiaudit.grcpc.modules.masterdata.catalog.control.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CentralControlGroupDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CentralControlGroupQueryService {
  private final CentralControlGroupRepository repository;

  public CentralControlGroupQueryService(CentralControlGroupRepository repository) {
    this.repository = repository;
  }

  @Transactional(readOnly = true)
  public List<CentralControlGroupDtos.Summary> list() {
    return repository
        .findByStatusNotOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus.DELETED)
        .stream()
        .map(this::summary)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<CentralControlGroupDtos.Summary> deleted() {
    return repository
        .findByStatusOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus.DELETED)
        .stream()
        .map(this::summary)
        .toList();
  }

  @Transactional(readOnly = true)
  public CentralControlGroupDtos.Detail detail(UUID id) {
    return repository
        .findByIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED)
        .map(this::detail)
        .orElseThrow(
            () ->
                new NotFoundException(
                    "MASTER_DATA_NOT_FOUND",
                    "error.masterdata.v2.notFound",
                    "Control Group not found",
                    id));
  }

  private CentralControlGroupDtos.Summary summary(CentralControlGroupEntity e) {
    return new CentralControlGroupDtos.Summary(
        e.getId(),
        e.getCode(),
        e.getTitle(),
        e.getParentGroupId(),
        e.getSortOrder(),
        e.getStatus(),
        e.getValidFrom(),
        e.getValidTo(),
        e.getVersion());
  }

  private CentralControlGroupDtos.Detail detail(CentralControlGroupEntity e) {
    return new CentralControlGroupDtos.Detail(
        e.getId(),
        e.getCode(),
        e.getTitle(),
        e.getParentGroupId(),
        e.getDescription(),
        e.getSortOrder(),
        e.getStatus(),
        e.getValidFrom(),
        e.getValidTo(),
        e.getVersion(),
        e.getCreatedAt(),
        e.getCreatedBy(),
        e.getUpdatedAt(),
        e.getUpdatedBy(),
        e.getDeletedAt(),
        e.getDeletedBy());
  }
}
