import { httpClient } from "@/shared/infra/http.client";
import type {
  CentralSubprocessControlObjectiveScope,
  ControlObjectiveScopeSelectionOptions,
  ControlObjectiveScopeStatusFilter,
} from "../domain/controlObjectiveScope.model";

function query(status: ControlObjectiveScopeStatusFilter, search: string): string {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (search.trim()) params.set("search", search.trim());
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const controlObjectiveScopeApi = {
  listForSubprocess: (
    subprocessId: string,
    status: ControlObjectiveScopeStatusFilter = "ALL",
    search = "",
    signal?: AbortSignal,
  ) => httpClient.get<CentralSubprocessControlObjectiveScope[]>(
    `/api/master-data/central/subprocesses/${subprocessId}/control-objective-scopes${query(status, search)}`,
    { signal },
  ),
  listForControlObjective: (
    controlObjectiveId: string,
    status: ControlObjectiveScopeStatusFilter,
    search: string,
    signal?: AbortSignal,
  ) => httpClient.get<CentralSubprocessControlObjectiveScope[]>(
    `/api/master-data/central/control-objectives/${controlObjectiveId}/subprocess-scopes${query(status, search)}`,
    { signal },
  ),
  options: (signal?: AbortSignal) => httpClient.get<ControlObjectiveScopeSelectionOptions>(
    "/api/master-data/central/control-objective-scope/options",
    { signal },
  ),
};
