package com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.api.dto.CentralRequirementControlAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.domain.entity.CentralRequirementControlAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationRequirementEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralRequirementControlAssignmentMapper {
  public CentralRequirementControlAssignmentResponse response(CentralRequirementControlAssignmentEntity row, CentralControlEntity owner, CentralRegulationRequirementEntity destination) {
    return new CentralRequirementControlAssignmentResponse(row.getId(),
        owner.getId(), owner.getCode(), owner.getTitle(), owner.getStatus(), owner.getValidFrom(), owner.getValidTo(),
        destination.getId(), destination.getCode(), destination.getTitle(), destination.getStatus(), destination.getValidFrom(), destination.getValidTo(),
        row.getStatus(), row.getValidFrom(), row.getValidTo(), row.getVersion(),
        row.getCreatedAt(), row.getCreatedBy(), row.getUpdatedAt(), row.getUpdatedBy(), row.getDeletedAt(), row.getDeletedBy());
  }
}
