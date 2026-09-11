package com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.List;
import java.util.UUID;

public record DerivedSubprocessAccountGroupResponse(
    UUID accountGroupId, String accountGroupCode, String accountGroupTitle,
    UUID parentAccountGroupId, MasterDataLifecycleStatus accountGroupStatus,
    List<ControlContribution> contributingControls,
    List<ControlObjectiveContribution> contributingControlObjectives) {
  public DerivedSubprocessAccountGroupResponse {
    contributingControls = List.copyOf(contributingControls);
    contributingControlObjectives = List.copyOf(contributingControlObjectives);
  }

  public record ControlContribution(UUID controlId, String controlCode, String controlTitle,
      UUID controlScopeId, MasterDataLifecycleStatus controlScopeStatus,
      UUID classificationId, MasterDataLifecycleStatus classificationStatus) {}

  public record ControlObjectiveContribution(
      UUID controlObjectiveId, String controlObjectiveCode, String controlObjectiveTitle,
      String objectiveClass,
      UUID controlObjectiveScopeId, MasterDataLifecycleStatus controlObjectiveScopeStatus,
      UUID classificationId, MasterDataLifecycleStatus classificationStatus) {}
}
