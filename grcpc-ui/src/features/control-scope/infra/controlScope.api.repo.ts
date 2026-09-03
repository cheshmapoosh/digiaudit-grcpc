import { httpClient } from "@/shared/infra/http.client";
import type { CentralControlSummary } from "@/features/control/domain/centralControl.model";
import type { CentralSubprocessControlScope, ControlScopeOptions, ControlScopeStatusFilter } from "../domain/controlScope.model";

function query(status: ControlScopeStatusFilter, search: string): string {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (search.trim()) params.set("search", search.trim());
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const controlScopeApi = {
  listForSubprocess: (subprocessId: string, status: ControlScopeStatusFilter = "ALL", search = "", signal?: AbortSignal) =>
    httpClient.get<CentralSubprocessControlScope[]>(
      `/api/master-data/central/subprocesses/${subprocessId}/control-scopes${query(status, search)}`,
      { signal },
    ),
  listForControl: (controlId: string, status: ControlScopeStatusFilter, search: string, signal?: AbortSignal) =>
    httpClient.get<CentralSubprocessControlScope[]>(
      `/api/master-data/central/controls/${controlId}/subprocess-scopes${query(status, search)}`,
      { signal },
    ),
  options: (signal?: AbortSignal) =>
    httpClient.get<ControlScopeOptions>("/api/master-data/central/control-scope/options", { signal }),
  eligibleControls: (signal?: AbortSignal) =>
    httpClient.get<CentralControlSummary[]>("/api/master-data/central/control-scope/eligible-controls", { signal }),
};
