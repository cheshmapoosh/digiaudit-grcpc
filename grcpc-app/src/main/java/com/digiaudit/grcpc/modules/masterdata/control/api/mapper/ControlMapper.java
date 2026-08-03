package com.digiaudit.grcpc.modules.masterdata.control.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.control.api.dto.ControlSummaryDto;
import com.digiaudit.grcpc.modules.masterdata.control.domain.entity.ControlEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ControlMapper {
    ControlSummaryDto toSummary(ControlEntity entity);
}
