package com.digiaudit.grcpc.modules.masterdata.catalog.policy.application;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class CentralPolicyVersionQueryService {
  private final CentralPolicyQueryService family;

  public CentralPolicyVersionQueryService(CentralPolicyQueryService f) {
    family = f;
  }

  public List<CentralPolicyDtos.VersionDetail> list(UUID policyId) {
    return family.versions(policyId);
  }

  public List<CentralPolicyDtos.VersionDetail> deleted(UUID policyId) {
    return family.deletedVersions(policyId);
  }

  public CentralPolicyDtos.VersionDetail detail(UUID id) {
    return family.version(id);
  }
}
