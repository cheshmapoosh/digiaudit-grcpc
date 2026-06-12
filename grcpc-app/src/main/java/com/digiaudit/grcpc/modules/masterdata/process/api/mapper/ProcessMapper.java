package com.digiaudit.grcpc.modules.masterdata.process.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessNodeEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ProcessMapper {

    @Mapping(target = "controlAutomation", ignore = true)
    @Mapping(target = "controlFrequency", ignore = true)
    @Mapping(target = "controlClassification", ignore = true)
    @Mapping(target = "controlOwner", ignore = true)
    @Mapping(target = "testDirection", ignore = true)
    @Mapping(target = "testType", ignore = true)
    @Mapping(target = "testProgram", ignore = true)
    @Mapping(target = "importance", ignore = true)
    ProcessNodeResponse toResponse(ProcessNodeEntity entity);
}
