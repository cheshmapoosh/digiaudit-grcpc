package com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyVersionEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralPolicyMapper {
    public CentralPolicyDtos.Summary summary(CentralPolicyGroupEntity entity) {
        return summary(entity, entity.getParentGroupId(), entity.getSortOrder());
    }

    public CentralPolicyDtos.Summary summary(CentralPolicyEntity entity) {
        return summary(entity, entity.getPolicyGroupId(), entity.getSortOrder());
    }

    public CentralPolicyDtos.Detail detail(CentralPolicyGroupEntity entity) {
        return detail(entity, entity.getParentGroupId(), entity.getSortOrder());
    }

    public CentralPolicyDtos.Detail detail(CentralPolicyEntity entity) {
        return detail(entity, entity.getPolicyGroupId(), entity.getSortOrder());
    }

    public CentralPolicyDtos.VersionDetail detail(CentralPolicyVersionEntity entity) {
        return new CentralPolicyDtos.VersionDetail(entity.getId(), entity.getPolicyId(), entity.getVersionNumber(),
                entity.getContent(), entity.getVersionStatus(), entity.getPublishedAt(), entity.getPublishedBy(),
                entity.getStatus(), entity.getValidFrom(), entity.getValidTo(), entity.getVersion(), entity.getCreatedAt(),
                entity.getCreatedBy(), entity.getUpdatedAt(), entity.getUpdatedBy(), entity.getDeletedAt(), entity.getDeletedBy());
    }

    private CentralPolicyDtos.Summary summary(
            com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity entity,
            java.util.UUID parentId,
            int sortOrder
    ) {
        return new CentralPolicyDtos.Summary(entity.getId(), entity.getCode(), entity.getTitle(), parentId, sortOrder,
                entity.getStatus(), entity.getValidFrom(), entity.getValidTo(), entity.getVersion());
    }

    private CentralPolicyDtos.Detail detail(
            com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity entity,
            java.util.UUID parentId,
            int sortOrder
    ) {
        return new CentralPolicyDtos.Detail(entity.getId(), entity.getCode(), entity.getTitle(), parentId,
                entity.getDescription(), sortOrder, entity.getStatus(), entity.getValidFrom(), entity.getValidTo(),
                entity.getVersion(), entity.getCreatedAt(), entity.getCreatedBy(), entity.getUpdatedAt(),
                entity.getUpdatedBy(), entity.getDeletedAt(), entity.getDeletedBy());
    }
}
