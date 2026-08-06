package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.CentralRegulationDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationRequirementEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralRegulationMapper {
    public CentralRegulationDtos.Summary summary(CentralRegulationGroupEntity entity) {
        return summary(entity, entity.getParentGroupId(), entity.getSortOrder());
    }

    public CentralRegulationDtos.Summary summary(CentralRegulationEntity entity) {
        return summary(entity, entity.getRegulationGroupId(), entity.getSortOrder());
    }

    public CentralRegulationDtos.Summary summary(CentralRegulationRequirementEntity entity) {
        return summary(entity, entity.getRegulationId(), entity.getSortOrder());
    }

    public CentralRegulationDtos.Detail detail(CentralRegulationGroupEntity entity) {
        return detail(entity, entity.getParentGroupId(), entity.getSortOrder());
    }

    public CentralRegulationDtos.Detail detail(CentralRegulationEntity entity) {
        return detail(entity, entity.getRegulationGroupId(), entity.getSortOrder());
    }

    public CentralRegulationDtos.Detail detail(CentralRegulationRequirementEntity entity) {
        return detail(entity, entity.getRegulationId(), entity.getSortOrder());
    }

    private CentralRegulationDtos.Summary summary(
            com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity entity,
            java.util.UUID parentId,
            int sortOrder
    ) {
        return new CentralRegulationDtos.Summary(entity.getId(), entity.getCode(), entity.getTitle(), parentId,
                sortOrder, entity.getStatus(), entity.getValidFrom(), entity.getValidTo(), entity.getVersion());
    }

    private CentralRegulationDtos.Detail detail(
            com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity entity,
            java.util.UUID parentId,
            int sortOrder
    ) {
        return new CentralRegulationDtos.Detail(entity.getId(), entity.getCode(), entity.getTitle(), parentId,
                entity.getDescription(), sortOrder, entity.getStatus(), entity.getValidFrom(), entity.getValidTo(),
                entity.getVersion(), entity.getCreatedAt(), entity.getCreatedBy(), entity.getUpdatedAt(),
                entity.getUpdatedBy(), entity.getDeletedAt(), entity.getDeletedBy());
    }
}
