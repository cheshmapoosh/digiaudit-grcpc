package com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.api.dto.CentralControlObjectiveResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.api.dto.CentralControlObjectiveSummaryResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.api.mapper.CentralControlObjectiveMapper;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.repository.CentralControlObjectiveRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CentralControlObjectiveQueryService {
  private final CentralControlObjectiveRepository repository;
  private final CentralControlObjectiveMapper mapper;

  public CentralControlObjectiveQueryService(
      CentralControlObjectiveRepository repository, CentralControlObjectiveMapper mapper) {
    this.repository = repository;
    this.mapper = mapper;
  }

  @Transactional(readOnly = true)
  public List<CentralControlObjectiveSummaryResponse> list() {
    return repository
        .findByStatusNotOrderByTitleAscIdAsc(MasterDataLifecycleStatus.DELETED)
        .stream()
        .map(mapper::toSummary)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<CentralControlObjectiveSummaryResponse> listDeleted() {
    return repository.findByStatusOrderByTitleAscIdAsc(MasterDataLifecycleStatus.DELETED).stream()
        .map(mapper::toSummary)
        .toList();
  }

  @Transactional(readOnly = true)
  public CentralControlObjectiveResponse detail(UUID id) {
    return repository
        .findByIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED)
        .map(mapper::toResponse)
        .orElseThrow(
            () ->
                new NotFoundException(
                    "MASTER_DATA_NOT_FOUND",
                    "error.masterdata.v2.notFound",
                    "Control Objective not found",
                    id));
  }
}
