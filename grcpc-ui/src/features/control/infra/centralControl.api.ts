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
  list: (deleted = false) =>
    httpClient.get<CentralControlSummary[]>(
      `${BASE}${deleted ? "/deleted" : ""}`,
    ),
  detail: (id: string) => httpClient.get<CentralControlDetail>(`${BASE}/${id}`),
  create: (body: CreateCentralControlCommand) =>
    httpClient.post<CentralControlMutationResponse>(BASE, body),
  update: (id: string, body: UpdateCentralControlCommand) =>
    httpClient.patch<CentralControlMutationResponse>(`${BASE}/${id}`, body),
  lifecycle: (
    id: string,
    action: "activate" | "inactivate" | "delete" | "restore",
    version: number,
  ) =>
    httpClient.post<CentralControlRevisionResponse>(`${BASE}/${id}/${action}`, {
      version,
    }),
};
