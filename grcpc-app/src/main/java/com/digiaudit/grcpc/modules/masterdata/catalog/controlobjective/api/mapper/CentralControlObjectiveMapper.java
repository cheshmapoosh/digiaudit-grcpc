package com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.api.dto.CentralControlObjectiveResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.api.dto.CentralControlObjectiveSummaryResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CentralControlObjectiveMapper {
  CentralControlObjectiveResponse toResponse(CentralControlObjectiveEntity entity);

  CentralControlObjectiveSummaryResponse toSummary(CentralControlObjectiveEntity entity);
}
