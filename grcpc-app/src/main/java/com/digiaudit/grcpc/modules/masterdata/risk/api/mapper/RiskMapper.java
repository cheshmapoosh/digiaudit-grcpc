package com.digiaudit.grcpc.modules.masterdata.risk.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.risk.api.dto.RiskNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.risk.domain.entity.RiskNodeEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface RiskMapper {
    RiskNodeResponse toResponse(RiskNodeEntity entity);
}
