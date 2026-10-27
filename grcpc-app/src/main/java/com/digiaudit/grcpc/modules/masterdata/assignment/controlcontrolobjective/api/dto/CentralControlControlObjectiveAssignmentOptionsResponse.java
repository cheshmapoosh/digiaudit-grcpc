package com.digiaudit.grcpc.modules.masterdata.assignment.controlcontrolobjective.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CentralControlControlObjectiveAssignmentOptionsResponse(List<ControlObjectiveOption> controlObjectives) {
  public CentralControlControlObjectiveAssignmentOptionsResponse { controlObjectives = List.copyOf(controlObjectives); }
  public record ControlObjectiveOption(UUID id, String code, String title,
      MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo) {}
}
