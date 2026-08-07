package com.digiaudit.grcpc.modules.masterdata.catalog.control.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CentralControlResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CentralControlSummaryResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.mapper.CentralControlMapper;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CentralControlQueryService {
  private final CentralControlRepository repository;
  private final CentralControlMapper mapper;

  public CentralControlQueryService(
      CentralControlRepository repository, CentralControlMapper mapper) {
    this.repository = repository;
    this.mapper = mapper;
  }

  @Transactional(readOnly = true)
  public List<CentralControlSummaryResponse> list() {
    return repository
        .findByStatusNotOrderByTitleAscIdAsc(MasterDataLifecycleStatus.DELETED)
        .stream()
        .map(mapper::toSummary)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<CentralControlSummaryResponse> listDeleted() {
    return repository.findByStatusOrderByTitleAscIdAsc(MasterDataLifecycleStatus.DELETED).stream()
        .map(mapper::toSummary)
        .toList();
  }

  @Transactional(readOnly = true)
  public CentralControlResponse detail(UUID id) {
    return repository
        .findByIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED)
        .map(mapper::toResponse)
        .orElseThrow(
            () ->
                new NotFoundException(
                    "MASTER_DATA_NOT_FOUND",
                    "error.masterdata.v2.notFound",
                    "Control not found",
                    id));
  }
}
