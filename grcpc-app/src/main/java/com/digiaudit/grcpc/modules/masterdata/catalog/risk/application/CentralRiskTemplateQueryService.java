package com.digiaudit.grcpc.modules.masterdata.catalog.risk.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.CentralRiskTemplateResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.CentralRiskTemplateSummaryResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.mapper.CentralRiskMapper;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.repository.CentralRiskTemplateRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CentralRiskTemplateQueryService {
    private final CentralRiskTemplateRepository repository;
    private final CentralRiskMapper mapper;

    public CentralRiskTemplateQueryService(CentralRiskTemplateRepository repository, CentralRiskMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<CentralRiskTemplateSummaryResponse> list(UUID categoryId) {
        var rows = categoryId == null
                ? repository.findByStatusNotOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus.DELETED)
                : repository.findByRiskCategoryIdAndStatusNotOrderBySortOrderAscTitleAscIdAsc(categoryId, MasterDataLifecycleStatus.DELETED);
        return rows.stream().map(mapper::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public List<CentralRiskTemplateSummaryResponse> listDeleted() {
        return repository.findByStatusOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus.DELETED)
                .stream().map(mapper::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public CentralRiskTemplateResponse detail(UUID id) {
        return repository.findByIdAndStatusNot(id, MasterDataLifecycleStatus.DELETED)
                .map(mapper::toResponse)
                .orElseThrow(() -> new NotFoundException("MASTER_DATA_NOT_FOUND", "error.masterdata.v2.notFound", "Risk Template not found", id));
    }
}
