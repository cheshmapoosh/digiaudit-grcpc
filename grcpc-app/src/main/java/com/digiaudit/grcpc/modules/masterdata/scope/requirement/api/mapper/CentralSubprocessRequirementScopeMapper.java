package com.digiaudit.grcpc.modules.masterdata.scope.requirement.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationRequirementEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.api.dto.CentralSubprocessRequirementScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.entity.CentralSubprocessRequirementScopeEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralSubprocessRequirementScopeMapper {
  public CentralSubprocessRequirementScopeResponse toResponse(
      CentralSubprocessRequirementScopeEntity scope,
      CentralSubprocessEntity subprocess,
      CentralRegulationRequirementEntity requirement) {
    return new CentralSubprocessRequirementScopeResponse(
        scope.getId(), scope.getSubprocessId(), subprocess.getCode(), subprocess.getTitle(),
        scope.getRequirementId(), requirement.getCode(), requirement.getTitle(),
        requirement.getRegulationId(), scope.getStatus(), scope.getValidFrom(), scope.getValidTo(),
        scope.getVersion(), scope.getCreatedAt(), scope.getCreatedBy(), scope.getUpdatedAt(),
        scope.getUpdatedBy(), scope.getDeletedAt(), scope.getDeletedBy());
  }
}
