import { httpClient } from "@/shared/infra/http.client";
import type { Objective, ObjectiveCreate, ObjectiveUpdate, OrganizationObjective, ObjectiveOrganizationLink, ObjectiveOrganizationOption } from "../domain/objective.model";

type Mutation = { entityId: string; version: number; revisionId: string };

const base = "/api/objectives";

export const objectiveApi = {
  list: () => httpClient.get<Objective[]>(base),
  detail: (id: string) => httpClient.get<Objective>(base + "/" + id),
  organizations: (id: string) => httpClient.get<ObjectiveOrganizationLink[]>(base + "/" + id + "/organizations"),
  organizationOptions: () => httpClient.get<ObjectiveOrganizationOption[]>("/api/master-data/organizations"),
  create: (body: ObjectiveCreate) => httpClient.post<Mutation>(base, body),
  update: (id: string, body: ObjectiveUpdate) => httpClient.put<Mutation>(base + "/" + id, body),
  remove: (id: string, version: number) => httpClient.delete<Mutation>(
    base + "/" + id + "?version=" + version),
  listForOrganization: (organizationId: string) =>
    httpClient.get<OrganizationObjective[]>("/api/organizations/" + organizationId + "/objectives"),
  assign: (organizationId: string, body: {
    objectiveId: string; name: string | null; description: string | null; owner: string | null;
    validFrom: string | null; validTo: string | null;
  }) => httpClient.post<Mutation>("/api/organizations/" + organizationId + "/objectives", body),
  updateAssignment: (organizationId: string, objectiveId: string, body: {
    name: string; description: string | null; owner: string | null;
    validFrom: string | null; validTo: string | null; version: number;
  }) => httpClient.put<Mutation>(
    "/api/organizations/" + organizationId + "/objectives/" + objectiveId, body),
  removeAssignment: (organizationId: string, objectiveId: string, version: number) =>
    httpClient.delete<Mutation>(
      "/api/organizations/" + organizationId + "/objectives/" + objectiveId + "?version=" + version),
};
