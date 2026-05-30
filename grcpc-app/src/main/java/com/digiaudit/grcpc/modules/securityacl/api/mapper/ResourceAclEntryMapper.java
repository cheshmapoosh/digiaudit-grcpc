package com.digiaudit.grcpc.modules.securityacl.api.mapper;

import com.digiaudit.grcpc.modules.securityacl.api.dto.ResourceAclEntryResponse;
import com.digiaudit.grcpc.modules.securityacl.domain.entity.ResourceAclEntryEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ResourceAclEntryMapper {
    ResourceAclEntryResponse toResponse(ResourceAclEntryEntity entity);
}
