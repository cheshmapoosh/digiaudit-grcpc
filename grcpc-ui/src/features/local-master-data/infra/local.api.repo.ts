import { httpClient } from "@/shared/infra/http.client";
import type {
    LocalMutation, LocalOption, LocalPage, LocalRows, LocalSectionKey, LocalStatus,
    LocalSource, LocalAction, LocalPropagation,
} from "../domain/local.model";

const ROOT = "/api/master-data/local";
type Validity = { validFrom: string | null; validTo: string | null };
type Source<Reference extends string> = { sourceType: LocalSource } & Record<Reference, string | null>;

export interface LocalCreate {
    contexts: Validity & { organizationId: string; subprocessId: string; contextNote: string | null };
    "control-scopes": Validity & Source<"centralControlScopeId"> & {
        controlId: string; actualOwnerId: string | null; frequencyCode: string | null;
        executionMethodCode: string | null; testMethodCode: string | null;
        localContextNote: string | null;
    };
    "risk-scopes": Validity & Source<"centralRiskScopeId"> & { riskTemplateId: string };
    "control-objective-scopes": Validity & Source<"centralControlObjectiveScopeId"> & { controlObjectiveId: string };
    "requirement-scopes": Validity & Source<"centralRequirementScopeId"> & { requirementId: string };
    "risk-control-coverages": Validity & Source<"centralRiskControlCoverageId"> & {
        localRiskScopeId: string; localControlScopeId: string; coverageNote: string | null;
    };
    "risk-control-objective-coverages": Validity & Source<"centralRiskControlObjectiveCoverageId"> & {
        localRiskScopeId: string; localControlObjectiveScopeId: string; coverageNote: string | null;
    };
    "control-control-objective-coverages": Validity & Source<"centralControlControlObjectiveCoverageId"> & {
        localControlScopeId: string; localControlObjectiveScopeId: string; coverageNote: string | null;
    };
    "requirement-control-coverages": Validity & Source<"centralRequirementControlCoverageId"> & {
        localRequirementScopeId: string; localControlScopeId: string; coverageNote: string | null;
    };
    "organization-policies": Validity & { organizationId: string; policyId: string;
        scopeAction: LocalAction; propagationMode: LocalPropagation };
    "context-policies": Validity & { policyId: string; scopeAction: LocalAction };
    "control-policies": Validity & { policyId: string; scopeAction: LocalAction };
    "requirement-policies": Validity & { policyId: string; scopeAction: LocalAction };
}

export interface LocalUpdate {
    contexts: Validity & { version: number; contextNote: string | null };
    "control-scopes": Validity & { version: number; actualOwnerId: string | null;
        frequencyCode: string | null; executionMethodCode: string | null;
        testMethodCode: string | null; localContextNote: string | null };
    "risk-scopes": Validity & { version: number };
    "control-objective-scopes": Validity & { version: number };
    "requirement-scopes": Validity & { version: number };
    "risk-control-coverages": Validity & { version: number; coverageNote: string | null };
    "risk-control-objective-coverages": Validity & { version: number; coverageNote: string | null };
    "control-control-objective-coverages": Validity & { version: number; coverageNote: string | null };
    "requirement-control-coverages": Validity & { version: number; coverageNote: string | null };
    "organization-policies": Validity & { version: number; scopeAction: LocalAction;
        propagationMode: LocalPropagation };
    "context-policies": Validity & { version: number; scopeAction: LocalAction };
    "control-policies": Validity & { version: number; scopeAction: LocalAction };
    "requirement-policies": Validity & { version: number; scopeAction: LocalAction };
}

export interface LocalRouteOwner {
    organizationId: string;
    contextId?: string | null;
    policyTargetId?: string | null;
}

function base(section: LocalSectionKey, owner: LocalRouteOwner, list = false): string {
    if (section === "contexts") {
        return list
            ? `${ROOT}/organizations/${owner.organizationId}/contexts`
            : `${ROOT}/organization-subprocess-scopes`;
    }
    if (section === "organization-policies") return `${ROOT}/organization-policy-scopes`;
    if (section === "control-policies" || section === "requirement-policies") {
        const target = owner.policyTargetId;
        if (!target) throw new Error("Local Policy target is required");
        return `${ROOT}/${section === "control-policies" ? "control-scopes" : "requirement-scopes"}/${target}/policy-scopes`;
    }
    if (!owner.contextId) throw new Error("Local Context is required");
    return `${ROOT}/organization-subprocess-scopes/${owner.contextId}/${section === "context-policies" ? "policy-scopes" : section}`;
}

function query(values: Record<string, string | number | null | undefined>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
        if (value !== null && value !== undefined && value !== "") params.set(key, String(value));
    }
    return params.toString();
}

export const localApi = {
    list<K extends LocalSectionKey>(section: K, owner: LocalRouteOwner,
        lifecycleStatus: LocalStatus | null, page = 0, size = 25): Promise<LocalPage<LocalRows[K]>> {
        return httpClient.get<LocalPage<LocalRows[K]>>(`${base(section, owner, true)}?${query({
            organizationId: section === "contexts" ? undefined : owner.organizationId,
            lifecycleStatus, page, size,
        })}`);
    },
    detail<K extends LocalSectionKey>(section: K, owner: LocalRouteOwner,
        id: string): Promise<LocalRows[K]> {
        return httpClient.get<LocalRows[K]>(`${base(section, owner)}/${id}?${query({
            organizationId: owner.organizationId,
        })}`);
    },
    create<K extends LocalSectionKey>(section: K, owner: LocalRouteOwner,
        payload: LocalCreate[K]): Promise<LocalMutation<LocalRows[K]>> {
        return httpClient.post<LocalMutation<LocalRows[K]>>(
            `${base(section, owner)}?${query({ organizationId: owner.organizationId })}`, payload);
    },
    update<K extends LocalSectionKey>(section: K, owner: LocalRouteOwner,
        id: string, payload: LocalUpdate[K]): Promise<LocalMutation<LocalRows[K]>> {
        return httpClient.patch<LocalMutation<LocalRows[K]>>(
            `${base(section, owner)}/${id}?${query({ organizationId: owner.organizationId })}`, payload);
    },
    lifecycle<K extends LocalSectionKey>(section: K, owner: LocalRouteOwner,
        id: string, action: "activate" | "inactivate" | "delete" | "restore",
        version: number): Promise<{ version: number }> {
        return httpClient.post<{ version: number }>(
            `${base(section, owner)}/${id}/${action}?${query({ organizationId: owner.organizationId })}`,
            { version });
    },
    options(path: string, params: Record<string, string | number | null | undefined> = {}):
        Promise<LocalPage<LocalOption>> {
        return httpClient.get<LocalPage<LocalOption>>(`${ROOT}/${path}?${query(params)}`);
    },
    controlSettings(): Promise<{ frequencyCodes: string[]; executionMethodCodes: string[];
        testMethodCodes: string[] }> {
        return httpClient.get(`${ROOT}/options/control-settings`);
    },
    assignControl(payload: LocalCreate["control-scopes"] & {
        organizationId: string; subprocessId: string;
    }): Promise<{ revisionId: string; organizationId: string; contextId: string;
        contextVersion: number; localControlScopeId: string; localControlScopeVersion: number;
        contextCreated: boolean }> {
        return httpClient.post(`${ROOT}/control-assignments`, payload);
    },
    findContext(organizationId: string, subprocessId: string,
        lifecycleStatus: LocalStatus | null): Promise<LocalPage<LocalRows["contexts"]>> {
        return httpClient.get(`${ROOT}/organizations/${organizationId}/contexts?${query({
            subprocessId, lifecycleStatus, page: 0, size: 25,
        })}`);
    },
    reverse<K extends LocalSectionKey>(path: string, lifecycleStatus: LocalStatus | null,
        page = 0, organizationId?: string | null): Promise<LocalPage<LocalRows[K]>> {
        return httpClient.get(`${ROOT}/${path}?${query({
            lifecycleStatus, page, size: 25, organizationId,
        })}`);
    },
};
