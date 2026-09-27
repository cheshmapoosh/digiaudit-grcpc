import { httpClient } from "@/shared/infra/http.client";
import type {
  ControlGroup, ControlGroupCreate, ControlGroupUpdate, GlobalControl, GlobalControlCreate,
  GlobalControlUpdate, GlobalControlRegulation, RegulationOption, RegulationSelectionOptions,
} from "../domain/global-control.model";

type Mutation = { entityId: string; version: number; revisionId: string };
const groups = "/api/control-groups";
const controls = "/api/global-controls";

export const globalControlApi = {
  listGroups: () => httpClient.get<ControlGroup[]>(groups),
  createGroup: (body: ControlGroupCreate) => httpClient.post<Mutation>(groups, body),
  updateGroup: (id: string, body: ControlGroupUpdate) =>
    httpClient.put<Mutation>(groups + "/" + id, body),
  deleteGroup: (id: string, version: number) =>
    httpClient.delete<Mutation>(groups + "/" + id + "?version=" + version),
  listControls: () => httpClient.get<GlobalControl[]>(controls),
  createControl: (body: GlobalControlCreate) => httpClient.post<Mutation>(controls, body),
  updateControl: (id: string, body: GlobalControlUpdate) =>
    httpClient.put<Mutation>(controls + "/" + id, body),
  deleteControl: (id: string, version: number) =>
    httpClient.delete<Mutation>(controls + "/" + id + "?version=" + version),
  regulationOptions: () => httpClient.get<RegulationOption[]>(controls + "/regulation-options"),
  regulationSelection: () => httpClient.get<RegulationSelectionOptions>(controls + "/regulation-selection"),
  relatedRegulations: (id: string) =>
    httpClient.get<GlobalControlRegulation[]>(controls + "/" + id + "/regulations"),
  attachRegulation: (id: string, regulationId: string) =>
    httpClient.post<Mutation>(controls + "/" + id + "/regulations", { regulationId }),
  removeRegulation: (id: string, regulationId: string, version: number) =>
    httpClient.delete<Mutation>(controls + "/" + id + "/regulations/" + regulationId
      + "?version=" + version),
};
