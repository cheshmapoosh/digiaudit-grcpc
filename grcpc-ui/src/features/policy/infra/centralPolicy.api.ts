import { httpClient } from "@/shared/infra/http.client";
import type {
  CentralPolicyDetail,
  CentralPolicyAggregateResponse,
  CentralPolicyGroupDetail,
  CentralPolicyGroupSummary,
  CentralPolicyMutationResponse,
  CentralPolicyRevisionResponse,
  CentralPolicySummary,
  PolicySubprocessScopeRow,
  PolicyOrganizationScopeRow,
  PolicyControlScopeRow,
  PolicyRequirementScopeRow,
  PolicySubprocessOption,
  PolicyOrganizationOption,
  PolicyControlOption,
  PolicyRequirementOption,
  CreateCentralPolicyCommand,
  CreateCentralPolicyGroupCommand,
  MoveCentralPolicyCommand,
  MoveCentralPolicyGroupCommand,
  UpdateCentralPolicyCommand,
  UpdateCentralPolicyGroupCommand,
} from "../domain/centralPolicy.model";

const GROUPS = "/api/master-data/central/policy-groups",
  POLICIES = "/api/master-data/central/policies";

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
    httpClient.post<CentralPolicyAggregateResponse>(POLICIES, body),
  updatePolicy: (id: string, body: UpdateCentralPolicyCommand) =>
    httpClient.patch<CentralPolicyAggregateResponse>(`${POLICIES}/${id}`, body),
  movePolicy: (id: string, body: MoveCentralPolicyCommand) =>
    httpClient.post<CentralPolicyRevisionResponse>(`${POLICIES}/${id}/move`, body),
  policyLifecycle: (
    id: string,
    action: "activate" | "inactivate" | "delete" | "restore",
    version: number,
  ) => lifecycle(POLICIES, id, action, version),
  subprocessScopes: (id: string, deleted = false) =>
    httpClient.get<PolicySubprocessScopeRow[]>(`${POLICIES}/${id}/subprocess-scopes${deleted ? "/deleted" : ""}`),
  organizationScopes: (id: string, deleted = false) =>
    httpClient.get<PolicyOrganizationScopeRow[]>(`${POLICIES}/${id}/organization-scopes${deleted ? "/deleted" : ""}`),
  controlScopes: (id: string, deleted = false) =>
    httpClient.get<PolicyControlScopeRow[]>(`${POLICIES}/${id}/control-scopes${deleted ? "/deleted" : ""}`),
  requirementScopes: (id: string, deleted = false) =>
    httpClient.get<PolicyRequirementScopeRow[]>(`${POLICIES}/${id}/requirement-scopes${deleted ? "/deleted" : ""}`),
  subprocessOptions: () => httpClient.get<PolicySubprocessOption[]>(`${POLICIES}/scope-options/subprocesses`),
  organizationOptions: () => httpClient.get<PolicyOrganizationOption[]>(`${POLICIES}/scope-options/organizations`),
  controlOptions: () => httpClient.get<PolicyControlOption[]>(`${POLICIES}/scope-options/controls`),
  requirementOptions: () => httpClient.get<PolicyRequirementOption[]>(`${POLICIES}/scope-options/requirements`),
};
