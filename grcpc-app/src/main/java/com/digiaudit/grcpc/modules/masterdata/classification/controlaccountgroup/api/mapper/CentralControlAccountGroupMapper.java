package com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.entity.CentralAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto.CentralControlAccountGroupResponse;
import com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.domain.entity.CentralControlAccountGroupEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralControlAccountGroupMapper {
  public CentralControlAccountGroupResponse response(CentralControlAccountGroupEntity row,
      CentralControlEntity control, CentralAccountGroupEntity accountGroup) {
    return new CentralControlAccountGroupResponse(row.getId(), control.getId(), control.getCode(), control.getTitle(),
        accountGroup.getId(), accountGroup.getCode(), accountGroup.getTitle(), accountGroup.getParentAccountGroupId(),
        accountGroup.getStatus(), row.getStatus(), row.getValidFrom(), row.getValidTo(), row.getVersion(),
        row.getCreatedAt(), row.getCreatedBy(), row.getUpdatedAt(), row.getUpdatedBy(), row.getDeletedAt(), row.getDeletedBy());
  }
}
