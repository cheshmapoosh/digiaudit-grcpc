package com.digiaudit.grcpc.modules.masterdata.assignment.riskcontrolobjective.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CentralRiskControlObjectiveAssignmentOptionsResponse(List<RiskTemplateOption> riskTemplates) {
  public CentralRiskControlObjectiveAssignmentOptionsResponse { riskTemplates = List.copyOf(riskTemplates); }
  public record RiskTemplateOption(UUID id, String code, String title,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo) {}
}
