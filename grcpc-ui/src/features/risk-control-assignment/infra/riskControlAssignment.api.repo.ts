import { httpClient } from "@/shared/infra/http.client";
import type { RiskControlAssignment, RiskControlAssignmentOptions } from "../domain/riskControlAssignment.model";

// Mutations belong exclusively to the owning catalog aggregate Save.
export const riskControlAssignmentApi = {
  forControl: (id: string, signal?: AbortSignal) => httpClient.get<RiskControlAssignment[]>(`/api/master-data/central/controls/${id}/risk-assignments`, { signal }),
  deletedForControl: (id: string, signal?: AbortSignal) => httpClient.get<RiskControlAssignment[]>(`/api/master-data/central/controls/${id}/risk-assignments/deleted`, { signal }),
  forRiskTemplate: (id: string, signal?: AbortSignal) => httpClient.get<RiskControlAssignment[]>(`/api/master-data/central/risk-templates/${id}/control-assignments`, { signal }),
  options: (signal?: AbortSignal) => httpClient.get<RiskControlAssignmentOptions>("/api/master-data/central/risk-control-assignment/options", { signal }),
};
