package com.digiaudit.grcpc.modules.masterdata.objective.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.objective.api.dto.ObjectiveNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.entity.ObjectiveNodeEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ObjectiveMapper {
    ObjectiveNodeResponse toResponse(ObjectiveNodeEntity entity);
}
