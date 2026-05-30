package com.digiaudit.grcpc.modules.masterdata.accountgroup.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.accountgroup.api.dto.AccountGroupResponse;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.entity.AccountGroupEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AccountGroupMapper {
    AccountGroupResponse toResponse(AccountGroupEntity entity);
}
