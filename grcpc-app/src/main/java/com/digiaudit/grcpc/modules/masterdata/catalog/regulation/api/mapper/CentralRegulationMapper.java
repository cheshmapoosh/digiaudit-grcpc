package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.CentralRegulationDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationRequirementEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralRegulationMapper {
  public CentralRegulationDtos.GroupSummary summary(CentralRegulationGroupEntity entity) {
    return new CentralRegulationDtos.GroupSummary(
        entity.getId(),
        entity.getCode(),
        entity.getTitle(),
        entity.getParentGroupId(),
        entity.getSortOrder(),
        entity.getStatus(),
        entity.getValidFrom(),
        entity.getValidTo(),
        entity.getVersion());
  }

  public CentralRegulationDtos.RegulationSummary summary(CentralRegulationEntity entity) {
    return new CentralRegulationDtos.RegulationSummary(
        entity.getId(),
        entity.getCode(),
        entity.getTitle(),
        entity.getRegulationGroupId(),
        entity.getSortOrder(),
        entity.getStatus(),
        entity.getValidFrom(),
        entity.getValidTo(),
        entity.getVersion());
  }

  public CentralRegulationDtos.RequirementSummary summary(
      CentralRegulationRequirementEntity entity) {
    return new CentralRegulationDtos.RequirementSummary(
        entity.getId(),
        entity.getCode(),
        entity.getTitle(),
        entity.getRegulationId(),
        entity.getSortOrder(),
        entity.getStatus(),
        entity.getValidFrom(),
        entity.getValidTo(),
        entity.getVersion());
  }

  public CentralRegulationDtos.GroupDetail detail(CentralRegulationGroupEntity entity) {
    return new CentralRegulationDtos.GroupDetail(
        entity.getId(),
        entity.getCode(),
        entity.getTitle(),
        entity.getParentGroupId(),
        entity.getDescription(),
        entity.getSortOrder(),
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

  public CentralRegulationDtos.RegulationDetail detail(CentralRegulationEntity entity) {
    return new CentralRegulationDtos.RegulationDetail(
        entity.getId(),
        entity.getCode(),
        entity.getTitle(),
        entity.getRegulationGroupId(),
        entity.getDescription(),
        entity.getSortOrder(),
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

  public CentralRegulationDtos.RequirementDetail detail(CentralRegulationRequirementEntity entity) {
    return new CentralRegulationDtos.RequirementDetail(
        entity.getId(),
        entity.getCode(),
        entity.getTitle(),
        entity.getRegulationId(),
        entity.getDescription(),
        entity.getSortOrder(),
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
