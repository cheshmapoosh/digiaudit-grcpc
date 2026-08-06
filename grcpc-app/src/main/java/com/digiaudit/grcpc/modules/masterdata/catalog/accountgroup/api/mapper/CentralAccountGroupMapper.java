package com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.api.dto.CentralAccountGroupDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.entity.CentralAccountGroupEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralAccountGroupMapper {
    public CentralAccountGroupDtos.Summary summary(CentralAccountGroupEntity e) {
        return new CentralAccountGroupDtos.Summary(e.getId(), e.getCode(), e.getTitle(), e.getParentAccountGroupId(),
                e.getSortOrder(), e.getStatus(), e.getValidFrom(), e.getValidTo(), e.getVersion());
    }
    public CentralAccountGroupDtos.Detail detail(CentralAccountGroupEntity e) {
        return new CentralAccountGroupDtos.Detail(e.getId(), e.getCode(), e.getTitle(), e.getParentAccountGroupId(),
                e.getDescription(), e.getSortOrder(), e.getStatus(), e.getValidFrom(), e.getValidTo(), e.getVersion(),
                e.getCreatedAt(), e.getCreatedBy(), e.getUpdatedAt(), e.getUpdatedBy(), e.getDeletedAt(), e.getDeletedBy());
    }
}
