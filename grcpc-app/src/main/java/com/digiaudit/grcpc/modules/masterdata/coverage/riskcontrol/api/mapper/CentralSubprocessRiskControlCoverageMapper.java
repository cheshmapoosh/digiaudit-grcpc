package com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskTemplateEntity;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.api.dto.CentralSubprocessRiskControlCoverageResponse;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.domain.entity.CentralSubprocessRiskControlCoverageEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.entity.CentralSubprocessControlScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.domain.entity.CentralSubprocessRiskScopeEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralSubprocessRiskControlCoverageMapper {
  public CentralSubprocessRiskControlCoverageResponse toResponse(CentralSubprocessRiskControlCoverageEntity row, CentralSubprocessEntity subprocess, CentralSubprocessRiskScopeEntity riskScope, CentralRiskTemplateEntity risk, CentralSubprocessControlScopeEntity controlScope, CentralControlEntity control) {
    return new CentralSubprocessRiskControlCoverageResponse(row.getId(), row.getSubprocessId(), subprocess.getCode(), subprocess.getTitle(), riskScope.getId(), riskScope.getRiskTemplateId(), risk.getCode(), risk.getTitle(), riskScope.getStatus(), riskScope.getValidFrom(), riskScope.getValidTo(), controlScope.getId(), controlScope.getControlId(), control.getCode(), control.getTitle(), controlScope.getStatus(), controlScope.getValidFrom(), controlScope.getValidTo(), row.getStatus(), row.getValidFrom(), row.getValidTo(), row.getVersion(), row.getCreatedAt(), row.getCreatedBy(), row.getUpdatedAt(), row.getUpdatedBy(), row.getDeletedAt(), row.getDeletedBy());
  }
}
