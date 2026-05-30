package com.digiaudit.grcpc.modules.masterdata.process.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ControlEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessNodeEntity;
import java.util.UUID;
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

    default ProcessNodeResponse toControlResponse(ControlEntity entity, UUID parentId) {
        return ProcessNodeResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .title(entity.getTitle())
                .nodeType("control")
                .parentId(parentId)
                .status(entity.getStatus())
                .sortOrder(entity.getSortOrder())
                .description(entity.getDescription())
                .ownerId(entity.getOwnerId())
                .ownerName(entity.getOwnerName())
                .documentsCount(entity.getDocumentsCount())
                .controlAutomation(entity.getControlAutomation())
                .controlFrequency(entity.getControlFrequency())
                .controlClassification(entity.getControlClassification())
                .controlOwner(entity.getControlOwner())
                .testDirection(entity.getTestDirection())
                .testType(entity.getTestType())
                .testProgram(entity.getTestProgram())
                .importance(entity.getImportance())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }
}
