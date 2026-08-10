import { httpClient } from "@/shared/infra/http.client";
import type {
  CentralRegulationDetail,
  CentralRegulationGroupDetail,
  CentralRegulationGroupSummary,
  CentralRegulationMutationResponse,
  CentralRegulationRequirementDetail,
  CentralRegulationRequirementSummary,
  CentralRegulationRevisionResponse,
  CentralRegulationSummary,
  CreateCentralRegulationCommand,
  CreateCentralRegulationGroupCommand,
  CreateCentralRegulationRequirementCommand,
  MoveCentralRegulationCommand,
  MoveCentralRegulationGroupCommand,
  MoveCentralRegulationRequirementCommand,
  UpdateCentralRegulationCommand,
  UpdateCentralRegulationGroupCommand,
  UpdateCentralRegulationRequirementCommand,
} from "../domain/centralRegulation.model";

const GROUPS = "/api/master-data/central/regulation-groups";
const REGULATIONS = "/api/master-data/central/regulations";
const REQUIREMENTS = "/api/master-data/central/regulation-requirements";

const lifecycle = (
  base: string,
  id: string,
  action: "activate" | "inactivate" | "delete" | "restore",
  version: number,
) =>
  httpClient.post<CentralRegulationRevisionResponse>(`${base}/${id}/${action}`, {
    version,
  });

function optionalParentQuery(parameter: string, value?: string | null) {
  return value ? `?${parameter}=${encodeURIComponent(value)}` : "";
}

export const centralRegulationApi = {
  listGroups: (deleted = false) =>
    httpClient.get<CentralRegulationGroupSummary[]>(
      `${GROUPS}${deleted ? "/deleted" : ""}`,
    ),
  group: (id: string) =>
    httpClient.get<CentralRegulationGroupDetail>(`${GROUPS}/${id}`),
  createGroup: (body: CreateCentralRegulationGroupCommand) =>
    httpClient.post<CentralRegulationMutationResponse>(GROUPS, body),
  updateGroup: (id: string, body: UpdateCentralRegulationGroupCommand) =>
    httpClient.patch<CentralRegulationMutationResponse>(`${GROUPS}/${id}`, body),
  moveGroup: (id: string, body: MoveCentralRegulationGroupCommand) =>
    httpClient.post<CentralRegulationRevisionResponse>(`${GROUPS}/${id}/move`, body),
  groupLifecycle: (
    id: string,
    action: "activate" | "inactivate" | "delete" | "restore",
    version: number,
  ) => lifecycle(GROUPS, id, action, version),

  listRegulations: (groupId?: string | null, deleted = false) =>
    httpClient.get<CentralRegulationSummary[]>(
      deleted
        ? `${REGULATIONS}/deleted`
        : `${REGULATIONS}${optionalParentQuery("groupId", groupId)}`,
    ),
  regulation: (id: string) =>
    httpClient.get<CentralRegulationDetail>(`${REGULATIONS}/${id}`),
  createRegulation: (body: CreateCentralRegulationCommand) =>
    httpClient.post<CentralRegulationMutationResponse>(REGULATIONS, body),
  updateRegulation: (id: string, body: UpdateCentralRegulationCommand) =>
    httpClient.patch<CentralRegulationMutationResponse>(`${REGULATIONS}/${id}`, body),
  moveRegulation: (id: string, body: MoveCentralRegulationCommand) =>
    httpClient.post<CentralRegulationRevisionResponse>(`${REGULATIONS}/${id}/move`, body),
  regulationLifecycle: (
    id: string,
    action: "activate" | "inactivate" | "delete" | "restore",
    version: number,
  ) => lifecycle(REGULATIONS, id, action, version),

  listRequirements: (regulationId?: string | null, deleted = false) =>
    httpClient.get<CentralRegulationRequirementSummary[]>(
      deleted
        ? `${REQUIREMENTS}/deleted`
        : `${REQUIREMENTS}${optionalParentQuery("regulationId", regulationId)}`,
    ),
  requirement: (id: string) =>
    httpClient.get<CentralRegulationRequirementDetail>(`${REQUIREMENTS}/${id}`),
  createRequirement: (body: CreateCentralRegulationRequirementCommand) =>
    httpClient.post<CentralRegulationMutationResponse>(REQUIREMENTS, body),
  updateRequirement: (
    id: string,
    body: UpdateCentralRegulationRequirementCommand,
  ) => httpClient.patch<CentralRegulationMutationResponse>(`${REQUIREMENTS}/${id}`, body),
  moveRequirement: (
    id: string,
    body: MoveCentralRegulationRequirementCommand,
  ) => httpClient.post<CentralRegulationRevisionResponse>(`${REQUIREMENTS}/${id}/move`, body),
  requirementLifecycle: (
    id: string,
    action: "activate" | "inactivate" | "delete" | "restore",
    version: number,
  ) => lifecycle(REQUIREMENTS, id, action, version),
};
