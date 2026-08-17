package com.digiaudit.grcpc.modules.masterdata.catalog.control.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CentralControlResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.api.dto.CentralControlSummaryResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralControlMapper {
  public CentralControlSummaryResponse toSummary(CentralControlEntity entity) {
    return new CentralControlSummaryResponse(
        entity.getId(),
        entity.getCode(),
        entity.getTitle(),
        entity.getControlGroupId(),
        entity.getStatus(),
        entity.getValidFrom(),
        entity.getValidTo(),
        entity.getVersion());
  }

  public CentralControlResponse toResponse(CentralControlEntity entity) {
    return new CentralControlResponse(
        entity.getId(),
        entity.getCode(),
        entity.getTitle(),
        entity.getDescription(),
        entity.getControlGroupId(),
        entity.getControlClass(),
        entity.getImportance(),
        entity.getControlRisk(),
        entity.getAutomationType(),
        entity.getControlPurpose(),
        entity.getNature(),
        entity.getControlRelevance(),
        entity.getTriggerType(),
        entity.getEventDescription(),
        entity.getOperationFrequency(),
        entity.getToBeTested(),
        entity.getTestAutomationType(),
        entity.getTestingTechnique(),
        entity.getEvidenceLevel(),
        entity.getStatus(),
        entity.getValidFrom(),
        entity.getValidTo(),
        entity.getVersion(),
        entity.getCreatedAt(),
        entity.getCreatedBy(),
        entity.getUpdatedAt(),
        entity.getUpdatedBy(),
        entity.getDeletedAt(),
        entity.getDeletedBy());
  }
}
