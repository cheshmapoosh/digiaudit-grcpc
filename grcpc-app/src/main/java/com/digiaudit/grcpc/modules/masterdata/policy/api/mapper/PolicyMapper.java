package com.digiaudit.grcpc.modules.masterdata.policy.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.policy.api.dto.PolicyNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.policy.domain.entity.PolicyNodeEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PolicyMapper {
    @Mapping(source = "policyVersion", target = "version")
    PolicyNodeResponse toResponse(PolicyNodeEntity entity);
}
