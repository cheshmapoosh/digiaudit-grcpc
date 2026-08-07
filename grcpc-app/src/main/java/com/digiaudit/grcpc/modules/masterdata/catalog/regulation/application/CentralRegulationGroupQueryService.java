package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.application;

import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.CentralRegulationDtos;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class CentralRegulationGroupQueryService {
  private final CentralRegulationQueryService family;

  public CentralRegulationGroupQueryService(CentralRegulationQueryService family) {
    this.family = family;
  }

  public List<CentralRegulationDtos.GroupSummary> list() {
    return family.groups();
  }

  public List<CentralRegulationDtos.GroupSummary> deleted() {
    return family.deletedGroups();
  }

  public CentralRegulationDtos.GroupDetail detail(UUID id) {
    return family.group(id);
  }

  public List<CentralRegulationDtos.GroupTree> tree() {
    return family.tree();
  }
}
