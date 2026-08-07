package com.digiaudit.grcpc.modules.masterdata.catalog.policy.application;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.api.dto.CentralPolicyDtos;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class CentralPolicyGroupQueryService {
  private final CentralPolicyQueryService family;

  public CentralPolicyGroupQueryService(CentralPolicyQueryService f) {
    family = f;
  }

  public List<CentralPolicyDtos.GroupSummary> list() {
    return family.groups();
  }

  public List<CentralPolicyDtos.GroupSummary> deleted() {
    return family.deletedGroups();
  }

  public CentralPolicyDtos.GroupDetail detail(UUID id) {
    return family.group(id);
  }

  public List<CentralPolicyDtos.GroupTree> tree() {
    return family.tree();
  }
}
