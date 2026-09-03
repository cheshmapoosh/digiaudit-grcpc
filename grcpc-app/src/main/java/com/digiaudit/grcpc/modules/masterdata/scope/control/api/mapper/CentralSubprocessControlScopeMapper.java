package com.digiaudit.grcpc.modules.masterdata.scope.control.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.CentralSubprocessControlScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.entity.CentralSubprocessControlScopeEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralSubprocessControlScopeMapper {
  public CentralSubprocessControlScopeResponse toResponse(
      CentralSubprocessControlScopeEntity scope,
      CentralSubprocessEntity subprocess,
      CentralControlEntity control) {
    return new CentralSubprocessControlScopeResponse(
        scope.getId(),
        scope.getSubprocessId(),
        subprocess.getCode(),
        subprocess.getTitle(),
        scope.getControlId(),
        control.getCode(),
        control.getTitle(),
        scope.getRecommendedFrequencyCode(),
        scope.getRecommendedExecutionMethodCode(),
        scope.getRecommendedTestMethodCode(),
        scope.getStatus(),
        scope.getValidFrom(),
        scope.getValidTo(),
        scope.getVersion(),
        scope.getCreatedAt(),
        scope.getCreatedBy(),
        scope.getUpdatedAt(),
        scope.getUpdatedBy(),
        scope.getDeletedAt(),
        scope.getDeletedBy());
  }
}
