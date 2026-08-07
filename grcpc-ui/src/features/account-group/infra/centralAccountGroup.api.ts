import { httpClient } from "@/shared/infra/http.client";
import type {
  CentralAccountGroupDetail,
  CentralAccountGroupMutationResponse,
  CentralAccountGroupRevisionResponse,
  CentralAccountGroupSummary,
  CreateCentralAccountGroupCommand,
  MoveCentralAccountGroupCommand,
  UpdateCentralAccountGroupCommand,
} from "../domain/centralAccountGroup.model";
const BASE = "/api/master-data/central/account-groups";
export const centralAccountGroupApi = {
  list: (deleted = false) =>
    httpClient.get<CentralAccountGroupSummary[]>(
      `${BASE}${deleted ? "/deleted" : ""}`,
    ),
  detail: (id: string) =>
    httpClient.get<CentralAccountGroupDetail>(`${BASE}/${id}`),
  create: (body: CreateCentralAccountGroupCommand) =>
    httpClient.post<CentralAccountGroupMutationResponse>(BASE, body),
  update: (id: string, body: UpdateCentralAccountGroupCommand) =>
    httpClient.patch<CentralAccountGroupMutationResponse>(
      `${BASE}/${id}`,
      body,
    ),
  move: (id: string, body: MoveCentralAccountGroupCommand) =>
    httpClient.post<CentralAccountGroupRevisionResponse>(
      `${BASE}/${id}/move`,
      body,
    ),
  lifecycle: (
    id: string,
    action: "activate" | "inactivate" | "delete" | "restore",
    version: number,
  ) =>
    httpClient.post<CentralAccountGroupRevisionResponse>(
      `${BASE}/${id}/${action}`,
      { version },
    ),
};
