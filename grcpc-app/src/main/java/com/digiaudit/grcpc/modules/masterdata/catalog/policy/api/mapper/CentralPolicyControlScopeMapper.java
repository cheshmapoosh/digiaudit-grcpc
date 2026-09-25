package com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyControlScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.entity.CentralSubprocessControlScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlGroupEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralPolicyControlScopeMapper {
  public CentralPolicyDtos.PolicyControlScopeResponse response(CentralPolicyControlScopeEntity row, CentralSubprocessControlScopeEntity scope, CentralSubprocessEntity subprocess, CentralControlEntity control, CentralControlGroupEntity group) {
    return new CentralPolicyDtos.PolicyControlScopeResponse(
      row.getId(), row.getPolicyId(), scope.getId(), subprocess.getId(), subprocess.getCode(), subprocess.getTitle(), control.getId(), control.getCode(), control.getTitle(),
      group == null ? null : group.getCode(), group == null ? null : group.getTitle(),
      row.getStatus(), row.getValidFrom(), row.getValidTo(), row.getVersion());
  }
}
