import { httpClient } from "@/shared/infra/http.client";
import type { RiskControlObjectiveAssignment, RiskControlObjectiveAssignmentOptions } from "../domain/riskControlObjectiveAssignment.model";

// Mutations belong exclusively to the owning catalog aggregate Save.
export const riskControlObjectiveAssignmentApi = {
  forControlObjective: (id: string, signal?: AbortSignal) => httpClient.get<RiskControlObjectiveAssignment[]>(`/api/master-data/central/control-objectives/${id}/risk-assignments`, { signal }),
  deletedForControlObjective: (id: string, signal?: AbortSignal) => httpClient.get<RiskControlObjectiveAssignment[]>(`/api/master-data/central/control-objectives/${id}/risk-assignments/deleted`, { signal }),
  forRiskTemplate: (id: string, signal?: AbortSignal) => httpClient.get<RiskControlObjectiveAssignment[]>(`/api/master-data/central/risk-templates/${id}/control-objective-assignments`, { signal }),
  options: (signal?: AbortSignal) => httpClient.get<RiskControlObjectiveAssignmentOptions>("/api/master-data/central/risk-control-objective-assignment/options", { signal }),
};
