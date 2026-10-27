package com.digiaudit.grcpc.modules.masterdata.assignment.requirementcontrol.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CentralRequirementControlAssignmentOptionsResponse(List<RequirementOption> requirements) {
  public CentralRequirementControlAssignmentOptionsResponse { requirements = List.copyOf(requirements); }
  public record RequirementOption(UUID id, String code, String title,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo) {}
}
