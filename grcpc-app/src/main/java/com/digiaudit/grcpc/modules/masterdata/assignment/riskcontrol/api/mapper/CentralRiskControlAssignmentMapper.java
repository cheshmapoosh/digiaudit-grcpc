package com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.api.dto.CentralRiskControlAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrol.domain.entity.CentralRiskControlAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskTemplateEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralRiskControlAssignmentMapper {
  public CentralRiskControlAssignmentResponse response(CentralRiskControlAssignmentEntity row, CentralControlEntity owner, CentralRiskTemplateEntity destination) {
    return new CentralRiskControlAssignmentResponse(row.getId(),
        owner.getId(), owner.getCode(), owner.getTitle(), owner.getStatus(), owner.getValidFrom(), owner.getValidTo(),
        destination.getId(), destination.getCode(), destination.getTitle(), destination.getStatus(), destination.getValidFrom(), destination.getValidTo(),
        row.getStatus(), row.getValidFrom(), row.getValidTo(), row.getVersion(),
        row.getCreatedAt(), row.getCreatedBy(), row.getUpdatedAt(), row.getUpdatedBy(), row.getDeletedAt(), row.getDeletedBy());
  }
}
