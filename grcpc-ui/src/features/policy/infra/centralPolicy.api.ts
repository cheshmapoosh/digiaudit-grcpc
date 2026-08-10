import { httpClient } from "@/shared/infra/http.client";
import type {
  CentralPolicyDetail,
  CentralPolicyGroupDetail,
  CentralPolicyGroupSummary,
  CentralPolicyMutationResponse,
  CentralPolicyRevisionResponse,
  CentralPolicySummary,
  CentralPolicyVersionDetail,
  CreateCentralPolicyCommand,
  CreateCentralPolicyGroupCommand,
  CreateCentralPolicyVersionCommand,
  MoveCentralPolicyCommand,
  MoveCentralPolicyGroupCommand,
  UpdateCentralPolicyCommand,
  UpdateCentralPolicyGroupCommand,
  UpdateCentralPolicyVersionCommand,
} from "../domain/centralPolicy.model";

const GROUPS = "/api/master-data/central/policy-groups",
  POLICIES = "/api/master-data/central/policies",
  VERSIONS = "/api/master-data/central/policy-versions";

const lifecycle = (base: string, id: string, action: string, version: number) =>
  httpClient.post<CentralPolicyRevisionResponse>(`${base}/${id}/${action}`, {
    version,
  });

export const centralPolicyApi = {
  listGroups: () => httpClient.get<CentralPolicyGroupSummary[]>(GROUPS),
  group: (id: string) =>
    httpClient.get<CentralPolicyGroupDetail>(`${GROUPS}/${id}`),
  createGroup: (body: CreateCentralPolicyGroupCommand) =>
    httpClient.post<CentralPolicyMutationResponse>(GROUPS, body),
  updateGroup: (id: string, body: UpdateCentralPolicyGroupCommand) =>
    httpClient.patch<CentralPolicyMutationResponse>(`${GROUPS}/${id}`, body),
  moveGroup: (id: string, body: MoveCentralPolicyGroupCommand) =>
    httpClient.post<CentralPolicyRevisionResponse>(`${GROUPS}/${id}/move`, body),
  groupLifecycle: (
    id: string,
    action: "activate" | "inactivate" | "delete" | "restore",
    version: number,
  ) => lifecycle(GROUPS, id, action, version),
  listPolicies: (groupId?: string) =>
    httpClient.get<CentralPolicySummary[]>(
      groupId ? `${POLICIES}?groupId=${encodeURIComponent(groupId)}` : POLICIES,
    ),
  policy: (id: string) =>
    httpClient.get<CentralPolicyDetail>(`${POLICIES}/${id}`),
  createPolicy: (body: CreateCentralPolicyCommand) =>
    httpClient.post<CentralPolicyMutationResponse>(POLICIES, body),
  updatePolicy: (id: string, body: UpdateCentralPolicyCommand) =>
    httpClient.patch<CentralPolicyMutationResponse>(`${POLICIES}/${id}`, body),
  movePolicy: (id: string, body: MoveCentralPolicyCommand) =>
    httpClient.post<CentralPolicyRevisionResponse>(`${POLICIES}/${id}/move`, body),
  policyLifecycle: (
    id: string,
    action: "activate" | "inactivate" | "delete" | "restore",
    version: number,
  ) => lifecycle(POLICIES, id, action, version),
  listVersions: (policyId: string, deleted = false) =>
    httpClient.get<CentralPolicyVersionDetail[]>(
      `${POLICIES}/${policyId}/versions${deleted ? "/deleted" : ""}`,
    ),
  createVersion: (policyId: string, body: CreateCentralPolicyVersionCommand) =>
    httpClient.post<CentralPolicyMutationResponse>(
      `${POLICIES}/${policyId}/versions`,
      body,
    ),
  updateVersion: (id: string, body: UpdateCentralPolicyVersionCommand) =>
    httpClient.patch<CentralPolicyMutationResponse>(`${VERSIONS}/${id}`, body),
  publishVersion: (id: string, version: number) =>
    lifecycle(VERSIONS, id, "publish", version),
  versionLifecycle: (
    id: string,
    action: "delete" | "restore",
    version: number,
  ) => lifecycle(VERSIONS, id, action, version),
};
