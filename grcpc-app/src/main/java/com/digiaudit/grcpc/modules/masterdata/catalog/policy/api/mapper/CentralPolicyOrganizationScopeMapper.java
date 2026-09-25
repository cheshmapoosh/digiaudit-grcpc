package com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.mapper;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyOrganizationScopeEntity;
import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationEntity;
import org.springframework.stereotype.Component;

@Component
public class CentralPolicyOrganizationScopeMapper {
  public CentralPolicyDtos.PolicyOrganizationScopeResponse response(CentralPolicyOrganizationScopeEntity row, OrganizationEntity o, OrganizationEntity parent) {
    return new CentralPolicyDtos.PolicyOrganizationScopeResponse(
      row.getId(), row.getPolicyId(), o.getId(), o.getCode(), o.getName(), o.getParentOrganizationId(),
      parent == null ? null : parent.getCode(), parent == null ? null : parent.getName(),
      row.getStatus(), row.getValidFrom(), row.getValidTo(), row.getVersion());
  }
}
