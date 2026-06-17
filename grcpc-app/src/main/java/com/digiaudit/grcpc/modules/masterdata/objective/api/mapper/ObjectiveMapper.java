package com.digiaudit.grcpc.modules.masterdata.objective.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.objective.api.dto.ObjectiveNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.objective.api.dto.ObjectiveOrganizationResponse;
import com.digiaudit.grcpc.modules.masterdata.objective.domain.entity.ObjectiveNodeEntity;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ObjectiveMapper {
    @Mapping(target = "organizations", expression = "java(java.util.List.of())")
    ObjectiveNodeResponse toResponse(ObjectiveNodeEntity entity);

    default ObjectiveNodeResponse toResponse(
            ObjectiveNodeEntity entity,
            List<ObjectiveOrganizationResponse> organizations
    ) {
        if (entity == null) {
            return null;
        }

        return ObjectiveNodeResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .title(entity.getTitle())
                .nodeType(entity.getNodeType())
                .parentId(entity.getParentId())
                .status(entity.getStatus())
                .sortOrder(entity.getSortOrder())
                .description(entity.getDescription())
                .strategy(entity.getStrategy())
                .objectiveType(entity.getObjectiveType())
                .objectiveClass(entity.getObjectiveClass())
                .organizationUnitId(entity.getOrganizationUnitId())
                .organizationUnitName(entity.getOrganizationUnitName())
                .effectiveFrom(entity.getEffectiveFrom())
                .validUntil(entity.getValidUntil())
                .documentsCount(entity.getDocumentsCount())
                .organizations(organizations == null ? List.of() : organizations)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }
}
