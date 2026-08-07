package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.application;

import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.CentralRegulationDtos;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class CentralRegulationRequirementQueryService {
  private final CentralRegulationQueryService family;

  public CentralRegulationRequirementQueryService(CentralRegulationQueryService family) {
    this.family = family;
  }

  public List<CentralRegulationDtos.RequirementSummary> list(UUID regulationId) {
    return family.requirements(regulationId);
  }

  public List<CentralRegulationDtos.RequirementSummary> deleted() {
    return family.deletedRequirements();
  }

  public CentralRegulationDtos.RequirementDetail detail(UUID id) {
    return family.requirement(id);
  }
}
