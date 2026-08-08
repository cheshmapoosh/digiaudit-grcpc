import { httpClient } from "@/shared/infra/http.client";
import type {
  CentralControlDetail,
  CentralControlMutationResponse,
  CentralControlRevisionResponse,
  CentralControlSummary,
  CreateCentralControlCommand,
  UpdateCentralControlCommand,
} from "../domain/centralControl.model";

const BASE = "/api/master-data/central/controls";

export const centralControlApi = {
  list: () => httpClient.get<CentralControlSummary[]>(BASE),
  detail: (id: string) => httpClient.get<CentralControlDetail>(`${BASE}/${id}`),
  create: (body: CreateCentralControlCommand) =>
    httpClient.post<CentralControlMutationResponse>(BASE, body),
  update: (id: string, body: UpdateCentralControlCommand) =>
    httpClient.patch<CentralControlMutationResponse>(`${BASE}/${id}`, body),
  delete: (id: string, version: number) =>
    httpClient.post<CentralControlRevisionResponse>(`${BASE}/${id}/delete`, { version }),
};
