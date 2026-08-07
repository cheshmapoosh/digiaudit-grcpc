package com.digiaudit.grcpc.modules.masterdata.catalog.control.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CentralControlResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CentralControlSummaryResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CentralControlMapper {
  CentralControlResponse toResponse(CentralControlEntity entity);

  CentralControlSummaryResponse toSummary(CentralControlEntity entity);
}
