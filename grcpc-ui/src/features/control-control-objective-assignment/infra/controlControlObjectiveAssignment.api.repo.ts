import { httpClient } from "@/shared/infra/http.client";
import type { ControlControlObjectiveAssignment, ControlControlObjectiveAssignmentOptions } from "../domain/controlControlObjectiveAssignment.model";

// Mutations belong exclusively to the owning catalog aggregate Save.
export const controlControlObjectiveAssignmentApi = {
  forControl: (id: string, signal?: AbortSignal) => httpClient.get<ControlControlObjectiveAssignment[]>(`/api/master-data/central/controls/${id}/control-objective-assignments`, { signal }),
  deletedForControl: (id: string, signal?: AbortSignal) => httpClient.get<ControlControlObjectiveAssignment[]>(`/api/master-data/central/controls/${id}/control-objective-assignments/deleted`, { signal }),
  forControlObjective: (id: string, signal?: AbortSignal) => httpClient.get<ControlControlObjectiveAssignment[]>(`/api/master-data/central/control-objectives/${id}/control-assignments`, { signal }),
  options: (signal?: AbortSignal) => httpClient.get<ControlControlObjectiveAssignmentOptions>("/api/master-data/central/control-control-objective-assignment/options", { signal }),
};
