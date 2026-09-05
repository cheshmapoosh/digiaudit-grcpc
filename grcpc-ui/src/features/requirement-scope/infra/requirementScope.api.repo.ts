import { httpClient } from "@/shared/infra/http.client";
import type {
  CentralSubprocessRequirementScope,
  RequirementScopeSelectionOptions,
  RequirementScopeStatusFilter,
} from "../domain/requirementScope.model";

function query(status: RequirementScopeStatusFilter, search: string): string {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (search.trim()) params.set("search", search.trim());
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const requirementScopeApi = {
  listForSubprocess: (
    subprocessId: string,
    status: RequirementScopeStatusFilter = "ALL",
    search = "",
    signal?: AbortSignal,
  ) => httpClient.get<CentralSubprocessRequirementScope[]>(
    `/api/master-data/central/subprocesses/${subprocessId}/requirement-scopes${query(status, search)}`,
    { signal },
  ),
  listForRequirement: (
    requirementId: string,
    status: RequirementScopeStatusFilter,
    search: string,
    signal?: AbortSignal,
  ) => httpClient.get<CentralSubprocessRequirementScope[]>(
    `/api/master-data/central/regulation-requirements/${requirementId}/subprocess-scopes${query(status, search)}`,
    { signal },
  ),
  options: (signal?: AbortSignal) => httpClient.get<RequirementScopeSelectionOptions>(
    "/api/master-data/central/requirement-scope/options",
    { signal },
  ),
};
