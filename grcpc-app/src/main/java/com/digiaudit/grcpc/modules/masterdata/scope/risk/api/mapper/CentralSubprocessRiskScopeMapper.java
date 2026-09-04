package com.digiaudit.grcpc.modules.masterdata.scope.risk.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskTemplateEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.api.dto.CentralSubprocessRiskScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.domain.entity.CentralSubprocessRiskScopeEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralSubprocessRiskScopeMapper {
  public CentralSubprocessRiskScopeResponse toResponse(
      CentralSubprocessRiskScopeEntity scope,
      CentralSubprocessEntity subprocess,
      CentralRiskTemplateEntity riskTemplate) {
    return new CentralSubprocessRiskScopeResponse(
        scope.getId(),
        scope.getSubprocessId(),
        subprocess.getCode(),
        subprocess.getTitle(),
        scope.getRiskTemplateId(),
        riskTemplate.getCode(),
        riskTemplate.getTitle(),
        riskTemplate.getRiskCategoryId(),
        riskTemplate.getRiskType(),
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
