package com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.CentralRiskCategoryResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.CentralRiskCategorySummaryResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.CentralRiskTemplateResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.api.dto.CentralRiskTemplateSummaryResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskCategoryEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskTemplateEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CentralRiskMapper {
    CentralRiskCategoryResponse toResponse(CentralRiskCategoryEntity entity);
    CentralRiskCategorySummaryResponse toSummary(CentralRiskCategoryEntity entity);
    CentralRiskTemplateResponse toResponse(CentralRiskTemplateEntity entity);
    CentralRiskTemplateSummaryResponse toSummary(CentralRiskTemplateEntity entity);
}
