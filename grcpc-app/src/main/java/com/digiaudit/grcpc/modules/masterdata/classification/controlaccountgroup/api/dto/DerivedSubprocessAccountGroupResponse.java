package com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.List;
import java.util.UUID;

public record DerivedSubprocessAccountGroupResponse(
    UUID accountGroupId, String accountGroupCode, String accountGroupTitle,
    UUID parentAccountGroupId, MasterDataLifecycleStatus accountGroupStatus,
    List<Contribution> contributingControls) {
  public DerivedSubprocessAccountGroupResponse { contributingControls = List.copyOf(contributingControls); }
  public record Contribution(UUID controlId, String controlCode, String controlTitle,
      UUID controlScopeId, MasterDataLifecycleStatus controlScopeStatus,
      UUID classificationId, MasterDataLifecycleStatus classificationStatus) {}
}
