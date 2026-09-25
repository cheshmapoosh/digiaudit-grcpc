package com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskTemplateEntity;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.api.dto.CentralSubprocessRiskControlObjectiveCoverageResponse;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.domain.entity.CentralSubprocessRiskControlObjectiveCoverageEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.entity.CentralSubprocessControlObjectiveScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.domain.entity.CentralSubprocessRiskScopeEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralSubprocessRiskControlObjectiveCoverageMapper {
  public CentralSubprocessRiskControlObjectiveCoverageResponse toResponse(CentralSubprocessRiskControlObjectiveCoverageEntity row, CentralSubprocessEntity subprocess, CentralSubprocessRiskScopeEntity riskScope, CentralRiskTemplateEntity risk, CentralSubprocessControlObjectiveScopeEntity objectiveScope, CentralControlObjectiveEntity objective) {
    return new CentralSubprocessRiskControlObjectiveCoverageResponse(row.getId(), row.getSubprocessId(), subprocess.getCode(), subprocess.getTitle(), riskScope.getId(), riskScope.getRiskTemplateId(), risk.getCode(), risk.getTitle(), riskScope.getStatus(), riskScope.getValidFrom(), riskScope.getValidTo(), objectiveScope.getId(), objectiveScope.getControlObjectiveId(), objective.getCode(), objective.getTitle(), objectiveScope.getStatus(), objectiveScope.getValidFrom(), objectiveScope.getValidTo(), row.getStatus(), row.getValidFrom(), row.getValidTo(), row.getVersion(), row.getCreatedAt(), row.getCreatedBy(), row.getUpdatedAt(), row.getUpdatedBy(), row.getDeletedAt(), row.getDeletedBy());
  }
}
