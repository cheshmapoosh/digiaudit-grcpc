package com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyRequirementScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.entity.CentralSubprocessRequirementScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationRequirementEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralPolicyRequirementScopeMapper {
  public CentralPolicyDtos.PolicyRequirementScopeResponse response(CentralPolicyRequirementScopeEntity row, CentralSubprocessRequirementScopeEntity scope, CentralSubprocessEntity subprocess, CentralRegulationRequirementEntity requirement, CentralRegulationEntity regulation) {
    return new CentralPolicyDtos.PolicyRequirementScopeResponse(
      row.getId(), row.getPolicyId(), scope.getId(), subprocess.getId(), subprocess.getCode(), subprocess.getTitle(), requirement.getId(), requirement.getCode(), requirement.getTitle(),
      regulation.getCode(), regulation.getTitle(),
      row.getStatus(), row.getValidFrom(), row.getValidTo(), row.getVersion());
  }
}
