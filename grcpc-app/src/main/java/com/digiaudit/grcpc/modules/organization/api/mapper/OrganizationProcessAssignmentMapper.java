package com.digiaudit.grcpc.modules.organization.api.mapper;

import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationProcessAssignmentResponse;
import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationProcessAssignmentEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface OrganizationProcessAssignmentMapper {

    @Mapping(source = "active", target = "isActive")
    OrganizationProcessAssignmentResponse toResponse(OrganizationProcessAssignmentEntity entity);
}
