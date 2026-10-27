package com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api.dto.CentralRiskControlObjectiveAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.domain.entity.CentralRiskControlObjectiveAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskTemplateEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralRiskControlObjectiveAssignmentMapper {
  public CentralRiskControlObjectiveAssignmentResponse response(CentralRiskControlObjectiveAssignmentEntity row, CentralControlObjectiveEntity owner, CentralRiskTemplateEntity destination) {
    return new CentralRiskControlObjectiveAssignmentResponse(row.getId(),
        owner.getId(), owner.getCode(), owner.getTitle(), owner.getStatus(), owner.getValidFrom(), owner.getValidTo(),
        destination.getId(), destination.getCode(), destination.getTitle(), destination.getStatus(), destination.getValidFrom(), destination.getValidTo(),
        row.getStatus(), row.getValidFrom(), row.getValidTo(), row.getVersion(),
        row.getCreatedAt(), row.getCreatedBy(), row.getUpdatedAt(), row.getUpdatedBy(), row.getDeletedAt(), row.getDeletedBy());
  }
}
