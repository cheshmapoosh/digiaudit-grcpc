package com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.List;
import java.util.UUID;

public record CentralControlAccountGroupOptionsResponse(List<AccountGroupOption> accountGroups) {
  public CentralControlAccountGroupOptionsResponse { accountGroups = List.copyOf(accountGroups); }
  public record AccountGroupOption(UUID id, String code, String title, UUID parentAccountGroupId,
      int sortOrder, MasterDataLifecycleStatus status, List<AccountGroupOption> children) {
    public AccountGroupOption { children = List.copyOf(children); }
  }
}
