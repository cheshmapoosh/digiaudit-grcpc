import type { LocalRows, LocalSource, LocalAction, LocalPropagation, LocalStatus } from "./local.model";

export type LocalRelationOperation = "CREATE_OR_RESTORE" | "UPDATE" | "ACTIVATE" | "INACTIVATE" | "DELETE" | "RESTORE";
export interface ContextRef { contextId?: string | null; subprocessId?: string | null }
export interface ControlScopeRef { localControlScopeId?: string | null; contextRef?: ContextRef; controlId?: string }
export interface RequirementScopeRef { localRequirementScopeId?: string | null; contextRef?: ContextRef; requirementId?: string }
interface Change { operation: LocalRelationOperation; version?: number; validFrom?: string | null; validTo?: string | null; requestedStatus?: "ACTIVE" | "INACTIVE" }
interface ScopeChange extends Change { contextRef: ContextRef; scopeId?: string; sourceType?: LocalSource }
export interface LocalControlScopeChange extends ScopeChange { controlId: string; centralControlScopeId?: string | null; actualOwnerId?: string | null; frequencyCode?: string | null; executionMethodCode?: string | null; testMethodCode?: string | null; localContextNote?: string | null }
export interface LocalRiskScopeChange extends ScopeChange { riskTemplateId: string; centralRiskScopeId?: string | null }
export interface LocalControlObjectiveScopeChange extends ScopeChange { controlObjectiveId: string; centralControlObjectiveScopeId?: string | null }
export interface LocalRequirementScopeChange extends ScopeChange { requirementId: string; centralRequirementScopeId?: string | null }
interface PolicyChange extends Change { policyId: string; relationId?: string; scopeAction?: LocalAction }
export interface LocalOrganizationPolicyChange extends PolicyChange { propagationMode?: LocalPropagation }
export interface LocalContextPolicyChange extends PolicyChange { contextRef: ContextRef }
export interface LocalControlPolicyChange extends PolicyChange { controlScopeRef: ControlScopeRef }
export interface LocalRequirementPolicyChange extends PolicyChange { requirementScopeRef: RequirementScopeRef }
export interface OrganizationLocalDraftFields {
    localControlScopeChanges?: LocalControlScopeChange[];
    localRiskScopeChanges?: LocalRiskScopeChange[];
    localControlObjectiveScopeChanges?: LocalControlObjectiveScopeChange[];
    localRequirementScopeChanges?: LocalRequirementScopeChange[];
    localOrganizationPolicyChanges?: LocalOrganizationPolicyChange[];
    localContextPolicyChanges?: LocalContextPolicyChange[];
    localControlPolicyChanges?: LocalControlPolicyChange[];
    localRequirementPolicyChanges?: LocalRequirementPolicyChange[];
}
export interface OrganizationLocalResult {
    revisionId: string | null;
    contexts: LocalRows["contexts"][];
    controls: LocalRows["control-scopes"][];
    risks: LocalRows["risk-scopes"][];
    controlObjectives: LocalRows["control-objective-scopes"][];
    requirements: LocalRows["requirement-scopes"][];
    organizationPolicies: LocalRows["organization-policies"][];
    contextPolicies: LocalRows["context-policies"][];
    controlPolicies: LocalRows["control-policies"][];
    requirementPolicies: LocalRows["requirement-policies"][];
    objectives: import("@/features/objective").OrganizationObjective[];
}
export type OrganizationLocalSection = "control-scopes" | "risk-scopes" | "control-objective-scopes" | "requirement-scopes" | "organization-policies" | "context-policies" | "control-policies" | "requirement-policies";
export interface LocalRelationMetadata {
    validFrom: string | null; validTo: string | null;
    actualOwnerId?: string | null; frequencyCode?: string | null; executionMethodCode?: string | null;
    testMethodCode?: string | null; localContextNote?: string | null;
    scopeAction?: LocalAction; propagationMode?: LocalPropagation;
}
/** UI-only draft row; the adapter below emits only its closed family's typed request. */
export interface OrganizationLocalDraft {
    key: string; section: OrganizationLocalSection; ownerKey: string; identityId: string; code: string; name: string;
    operation: LocalRelationOperation; rowId?: string; version?: number; status: LocalStatus;
    contextRef?: ContextRef; controlScopeRef?: ControlScopeRef; requirementScopeRef?: RequirementScopeRef;
    sourceType?: LocalSource; centralReferenceId?: string | null;
    metadata: LocalRelationMetadata;
}
export function toOrganizationLocalPayload(drafts: OrganizationLocalDraft[]): OrganizationLocalDraftFields {
    const result: Required<OrganizationLocalDraftFields> = { localControlScopeChanges: [], localRiskScopeChanges: [], localControlObjectiveScopeChanges: [], localRequirementScopeChanges: [], localOrganizationPolicyChanges: [], localContextPolicyChanges: [], localControlPolicyChanges: [], localRequirementPolicyChanges: [] };
    for (const draft of drafts) {
        const base = { operation: draft.operation, version: draft.version,
            ...(draft.operation === "CREATE_OR_RESTORE" || draft.operation === "UPDATE" ? draft.metadata : {}),
            ...(draft.operation === "UPDATE" ? { requestedStatus: draft.status === "INACTIVE" ? "INACTIVE" as const : "ACTIVE" as const } : {}) };
        const scope = { ...base, contextRef: draft.contextRef!, scopeId: draft.rowId, sourceType: draft.sourceType };
        const policy = { ...base, policyId: draft.identityId, relationId: draft.rowId };
        switch (draft.section) {
            case "control-scopes": result.localControlScopeChanges.push({ ...scope, controlId: draft.identityId, centralControlScopeId: draft.centralReferenceId }); break;
            case "risk-scopes": result.localRiskScopeChanges.push({ ...scope, riskTemplateId: draft.identityId, centralRiskScopeId: draft.centralReferenceId }); break;
            case "control-objective-scopes": result.localControlObjectiveScopeChanges.push({ ...scope, controlObjectiveId: draft.identityId, centralControlObjectiveScopeId: draft.centralReferenceId }); break;
            case "requirement-scopes": result.localRequirementScopeChanges.push({ ...scope, requirementId: draft.identityId, centralRequirementScopeId: draft.centralReferenceId }); break;
            case "organization-policies": result.localOrganizationPolicyChanges.push(policy); break;
            case "context-policies": result.localContextPolicyChanges.push({ ...policy, contextRef: draft.contextRef! }); break;
            case "control-policies": result.localControlPolicyChanges.push({ ...policy, controlScopeRef: draft.controlScopeRef! }); break;
            case "requirement-policies": result.localRequirementPolicyChanges.push({ ...policy, requirementScopeRef: draft.requirementScopeRef! }); break;
        }
    }
    return result;
}
