import { httpClient } from "@/shared/infra/http.client";
import type {
  CentralControlDetail,
  CentralControlGroupDetail,
  CentralControlGroupSummary,
  CentralControlMutationResponse,
  CentralControlRevisionResponse,
  CentralControlSummary,
  CreateCentralControlCommand,
  CreateCentralControlGroupCommand,
  UpdateCentralControlCommand,
  UpdateCentralControlGroupCommand,
} from "../domain/centralControl.model";

const CONTROL_BASE = "/api/master-data/central/controls";
const GROUP_BASE = "/api/master-data/central/control-groups";

export const centralControlApi = {
  list: () => httpClient.get<CentralControlSummary[]>(CONTROL_BASE),
  detail: (id: string) => httpClient.get<CentralControlDetail>(`${CONTROL_BASE}/${id}`),
  create: (body: CreateCentralControlCommand) =>
    httpClient.post<CentralControlMutationResponse>(CONTROL_BASE, body),
  update: (id: string, body: UpdateCentralControlCommand) =>
    httpClient.patch<CentralControlMutationResponse>(`${CONTROL_BASE}/${id}`, body),
  delete: (id: string, version: number) =>
    httpClient.post<CentralControlRevisionResponse>(`${CONTROL_BASE}/${id}/delete`, { version }),

  listGroups: () => httpClient.get<CentralControlGroupSummary[]>(GROUP_BASE),
  group: (id: string) => httpClient.get<CentralControlGroupDetail>(`${GROUP_BASE}/${id}`),
  createGroup: (body: CreateCentralControlGroupCommand) =>
    httpClient.post<CentralControlRevisionResponse>(GROUP_BASE, body),
  updateGroup: (id: string, body: UpdateCentralControlGroupCommand) =>
    httpClient.patch<CentralControlRevisionResponse>(`${GROUP_BASE}/${id}`, body),
  deleteGroup: (id: string, version: number) =>
    httpClient.post<CentralControlRevisionResponse>(`${GROUP_BASE}/${id}/delete`, { version }),
};
