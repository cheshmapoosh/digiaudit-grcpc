import { httpClient } from "@/shared/infra/http.client";
import type { ControlAccountGroupClassification, ControlAccountGroupOptions, DerivedSubprocessAccountGroup } from "../domain/controlAccountGroup.model";

export const controlAccountGroupApi = {
  forControl: (controlId: string, signal?: AbortSignal) => httpClient.get<ControlAccountGroupClassification[]>(`/api/master-data/central/controls/${controlId}/account-groups`, { signal }),
  deletedForControl: (controlId: string, signal?: AbortSignal) => httpClient.get<ControlAccountGroupClassification[]>(`/api/master-data/central/controls/${controlId}/account-groups/deleted`, { signal }),
  forAccountGroup: (accountGroupId: string, signal?: AbortSignal) => httpClient.get<ControlAccountGroupClassification[]>(`/api/master-data/central/account-groups/${accountGroupId}/controls`, { signal }),
  options: (signal?: AbortSignal) => httpClient.get<ControlAccountGroupOptions>("/api/master-data/central/control-account-group-options", { signal }),
  forSubprocess: (subprocessId: string, signal?: AbortSignal) => httpClient.get<DerivedSubprocessAccountGroup[]>(`/api/master-data/central/subprocesses/${subprocessId}/account-groups`, { signal }),
};
