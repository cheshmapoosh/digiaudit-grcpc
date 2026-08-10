import { httpClient } from "@/shared/infra/http.client";
import type {
  CentralControlObjectiveDetail,
  CentralControlObjectiveMutationResponse,
  CentralControlObjectiveRevisionResponse,
  CentralControlObjectiveSummary,
  CreateCentralControlObjectiveCommand,
  UpdateCentralControlObjectiveCommand,
} from "../domain/centralControlObjective.model";

const BASE = "/api/master-data/central/control-objectives";

export const centralControlObjectiveApi = {
  list: () => httpClient.get<CentralControlObjectiveSummary[]>(BASE),
  detail: (id: string) => httpClient.get<CentralControlObjectiveDetail>(`${BASE}/${id}`),
  create: (body: CreateCentralControlObjectiveCommand) =>
    httpClient.post<CentralControlObjectiveMutationResponse>(BASE, body),
  update: (id: string, body: UpdateCentralControlObjectiveCommand) =>
    httpClient.patch<CentralControlObjectiveMutationResponse>(`${BASE}/${id}`, body),
  delete: (id: string, version: number) =>
    httpClient.post<CentralControlObjectiveRevisionResponse>(`${BASE}/${id}/delete`, { version }),
};
