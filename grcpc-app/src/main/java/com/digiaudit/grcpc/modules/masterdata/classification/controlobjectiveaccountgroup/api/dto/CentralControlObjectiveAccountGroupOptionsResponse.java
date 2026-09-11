package com.digiaudit.grcpc.modules.masterdata.classification.controlobjectiveaccountgroup.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.List;
import java.util.UUID;

public record CentralControlObjectiveAccountGroupOptionsResponse(List<AccountGroupOption> accountGroups) {
  public CentralControlObjectiveAccountGroupOptionsResponse { accountGroups = List.copyOf(accountGroups); }

  public record AccountGroupOption(
      UUID id, String code, String title, UUID parentAccountGroupId,
      int sortOrder, MasterDataLifecycleStatus status, List<AccountGroupOption> children) {
    public AccountGroupOption { children = List.copyOf(children); }
  }
}
