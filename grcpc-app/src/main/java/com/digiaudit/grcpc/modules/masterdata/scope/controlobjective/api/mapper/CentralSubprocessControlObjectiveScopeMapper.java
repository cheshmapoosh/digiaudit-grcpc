package com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.dto.CentralSubprocessControlObjectiveScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.entity.CentralSubprocessControlObjectiveScopeEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralSubprocessControlObjectiveScopeMapper {
  public CentralSubprocessControlObjectiveScopeResponse toResponse(
      CentralSubprocessControlObjectiveScopeEntity scope,
      CentralSubprocessEntity subprocess,
      CentralControlObjectiveEntity objective) {
    return new CentralSubprocessControlObjectiveScopeResponse(
        scope.getId(), scope.getSubprocessId(), subprocess.getCode(), subprocess.getTitle(),
        scope.getControlObjectiveId(), objective.getCode(), objective.getTitle(),
        objective.getObjectiveClass(), scope.getStatus(), scope.getValidFrom(), scope.getValidTo(),
        scope.getVersion(), scope.getCreatedAt(), scope.getCreatedBy(), scope.getUpdatedAt(),
        scope.getUpdatedBy(), scope.getDeletedAt(), scope.getDeletedBy());
  }
}
