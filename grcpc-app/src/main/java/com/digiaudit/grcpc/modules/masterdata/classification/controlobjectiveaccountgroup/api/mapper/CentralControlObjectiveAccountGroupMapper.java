package com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.entity.CentralAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto.CentralControlObjectiveAccountGroupResponse;
import com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.domain.entity.CentralControlObjectiveAccountGroupEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralControlObjectiveAccountGroupMapper {
  public CentralControlObjectiveAccountGroupResponse response(
      CentralControlObjectiveAccountGroupEntity row,
      CentralControlObjectiveEntity controlObjective,
      CentralAccountGroupEntity accountGroup) {
    return new CentralControlObjectiveAccountGroupResponse(
        row.getId(), controlObjective.getId(), controlObjective.getCode(), controlObjective.getTitle(),
        accountGroup.getId(), accountGroup.getCode(), accountGroup.getTitle(),
        accountGroup.getParentAccountGroupId(), accountGroup.getStatus(), row.getStatus(),
        row.getValidFrom(), row.getValidTo(), row.getVersion(), row.getCreatedAt(), row.getCreatedBy(),
        row.getUpdatedAt(), row.getUpdatedBy(), row.getDeletedAt(), row.getDeletedBy());
  }
}
