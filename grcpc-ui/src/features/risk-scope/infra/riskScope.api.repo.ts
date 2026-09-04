import { httpClient } from "@/shared/infra/http.client";
import type {
  CentralSubprocessRiskScope,
  RiskScopeSelectionOptions,
  RiskScopeStatusFilter,
} from "../domain/riskScope.model";

function query(status: RiskScopeStatusFilter, search: string): string {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (search.trim()) params.set("search", search.trim());
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const riskScopeApi = {
  listForSubprocess: (
    subprocessId: string,
    status: RiskScopeStatusFilter = "ALL",
    search = "",
    signal?: AbortSignal,
  ) =>
    httpClient.get<CentralSubprocessRiskScope[]>(
      `/api/master-data/central/subprocesses/${subprocessId}/risk-scopes${query(status, search)}`,
      { signal },
    ),
  listForRiskTemplate: (
    riskTemplateId: string,
    status: RiskScopeStatusFilter,
    search: string,
    signal?: AbortSignal,
  ) =>
    httpClient.get<CentralSubprocessRiskScope[]>(
      `/api/master-data/central/risk-templates/${riskTemplateId}/subprocess-scopes${query(status, search)}`,
      { signal },
    ),
  options: (signal?: AbortSignal) =>
    httpClient.get<RiskScopeSelectionOptions>(
      "/api/master-data/central/risk-scope/options",
      { signal },
    ),
};
