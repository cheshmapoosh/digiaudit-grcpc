package com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyVersionEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralPolicyMapper {
  public CentralPolicyDtos.GroupSummary summary(CentralPolicyGroupEntity entity) {
    return new CentralPolicyDtos.GroupSummary(
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

  public CentralPolicyDtos.PolicySummary summary(CentralPolicyEntity entity) {
    return new CentralPolicyDtos.PolicySummary(
        entity.getId(),
        entity.getCode(),
        entity.getTitle(),
        entity.getPolicyGroupId(),
        entity.getPolicyType(),
        entity.getSortOrder(),
        entity.getStatus(),
        entity.getValidFrom(),
        entity.getValidTo(),
        entity.getVersion());
  }

  public CentralPolicyDtos.GroupDetail detail(CentralPolicyGroupEntity entity) {
    return new CentralPolicyDtos.GroupDetail(
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

  public CentralPolicyDtos.PolicyDetail detail(CentralPolicyEntity entity) {
    return new CentralPolicyDtos.PolicyDetail(
        entity.getId(),
        entity.getCode(),
        entity.getTitle(),
        entity.getPolicyGroupId(),
        entity.getPolicyType(),
        entity.getResponsibleOrganization(),
        entity.getCommunicationMethod(),
        entity.getNextReviewDate(),
        entity.getObjective(),
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

  public CentralPolicyDtos.VersionDetail detail(CentralPolicyVersionEntity entity) {
    return new CentralPolicyDtos.VersionDetail(
        entity.getId(),
        entity.getPolicyId(),
        entity.getVersionNumber(),
        entity.getContent(),
        entity.getVersionStatus(),
        entity.getPublishedAt(),
        entity.getPublishedBy(),
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
