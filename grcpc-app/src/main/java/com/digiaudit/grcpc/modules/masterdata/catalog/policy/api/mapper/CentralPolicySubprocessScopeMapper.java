package com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicySubprocessScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralProcessEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralPolicySubprocessScopeMapper {
  public CentralPolicyDtos.PolicySubprocessScopeResponse response(CentralPolicySubprocessScopeEntity row, CentralSubprocessEntity s, CentralProcessEntity process) {
    return new CentralPolicyDtos.PolicySubprocessScopeResponse(
      row.getId(), row.getPolicyId(), s.getId(), s.getCode(), s.getTitle(), s.getProcessId(),
      process.getCode(), process.getTitle(),
      row.getStatus(), row.getValidFrom(), row.getValidTo(), row.getVersion());
  }
}
