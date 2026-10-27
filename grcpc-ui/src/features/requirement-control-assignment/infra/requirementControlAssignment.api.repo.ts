import { httpClient } from "@/shared/infra/http.client";
import type { RequirementControlAssignment, RequirementControlAssignmentOptions } from "../domain/requirementControlAssignment.model";

// Mutations belong exclusively to the owning catalog aggregate Save.
export const requirementControlAssignmentApi = {
  forControl: (id: string, signal?: AbortSignal) => httpClient.get<RequirementControlAssignment[]>(`/api/master-data/central/controls/${id}/requirement-assignments`, { signal }),
  deletedForControl: (id: string, signal?: AbortSignal) => httpClient.get<RequirementControlAssignment[]>(`/api/master-data/central/controls/${id}/requirement-assignments/deleted`, { signal }),
  forRequirement: (id: string, signal?: AbortSignal) => httpClient.get<RequirementControlAssignment[]>(`/api/master-data/central/regulation-requirements/${id}/control-assignments`, { signal }),
  options: (signal?: AbortSignal) => httpClient.get<RequirementControlAssignmentOptions>("/api/master-data/central/requirement-control-assignment/options", { signal }),
};
