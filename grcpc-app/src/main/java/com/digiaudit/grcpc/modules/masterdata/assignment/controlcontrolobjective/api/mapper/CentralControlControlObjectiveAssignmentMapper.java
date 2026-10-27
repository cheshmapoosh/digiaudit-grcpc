package com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.api.dto.CentralControlControlObjectiveAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.domain.entity.CentralControlControlObjectiveAssignmentEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralControlControlObjectiveAssignmentMapper {
  public CentralControlControlObjectiveAssignmentResponse response(CentralControlControlObjectiveAssignmentEntity row, CentralControlEntity owner, CentralControlObjectiveEntity destination) {
    return new CentralControlControlObjectiveAssignmentResponse(row.getId(),
        owner.getId(), owner.getCode(), owner.getTitle(), owner.getStatus(), owner.getValidFrom(), owner.getValidTo(),
        destination.getId(), destination.getCode(), destination.getTitle(), destination.getStatus(), destination.getValidFrom(), destination.getValidTo(),
        row.getStatus(), row.getValidFrom(), row.getValidTo(), row.getVersion(),
        row.getCreatedAt(), row.getCreatedBy(), row.getUpdatedAt(), row.getUpdatedBy(), row.getDeletedAt(), row.getDeletedBy());
  }
}
