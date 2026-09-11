import { httpClient } from "@/shared/infra/http.client";
import type {
  ControlObjectiveAccountGroupClassification,
  ControlObjectiveAccountGroupOptions,
} from "../domain/controlObjectiveAccountGroup.model";

export const controlObjectiveAccountGroupApi = {
  forControlObjective: (controlObjectiveId: string, signal?: AbortSignal) =>
    httpClient.get<ControlObjectiveAccountGroupClassification[]>(
      `/api/master-data/central/control-objectives/${controlObjectiveId}/account-groups`,
      { signal },
    ),
  deletedForControlObjective: (controlObjectiveId: string, signal?: AbortSignal) =>
    httpClient.get<ControlObjectiveAccountGroupClassification[]>(
      `/api/master-data/central/control-objectives/${controlObjectiveId}/account-groups/deleted`,
      { signal },
    ),
  forAccountGroup: (accountGroupId: string, signal?: AbortSignal) =>
    httpClient.get<ControlObjectiveAccountGroupClassification[]>(
      `/api/master-data/central/account-groups/${accountGroupId}/control-objectives`,
      { signal },
    ),
  options: (signal?: AbortSignal) =>
    httpClient.get<ControlObjectiveAccountGroupOptions>(
      "/api/master-data/central/control-objective-account-group-options",
      { signal },
    ),
};
