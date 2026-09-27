import type { DocumentLinkTargetType } from "@/features/document/domain/document.model";

export type LocalStatus = "ACTIVE" | "INACTIVE" | "DELETED";
export type LocalSource = "INHERITED_FROM_CENTRAL" | "LOCAL_ADDED";
export type LocalAction = "INCLUDE" | "EXCLUDE";
export type LocalPropagation = "DIRECT_ONLY" | "INCLUDE_DESCENDANTS";
export type LocalSectionKey =
    | "contexts" | "control-scopes" | "risk-scopes" | "control-objective-scopes"
    | "requirement-scopes" | "risk-control-coverages" | "risk-control-objective-coverages"
    | "control-control-objective-coverages" | "requirement-control-coverages"
    | "organization-policies" | "context-policies" | "control-policies"
    | "requirement-policies";

export interface LocalBaseRow {
    id: string;
    organizationId: string;
    organizationCode: string;
    organizationLabel: string;
    status: LocalStatus;
    validFrom: string | null;
    validTo: string | null;
    version: number;
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
    deletedAt: string | null;
    deletedBy: string | null;
}

export interface LocalContextRow extends LocalBaseRow {
    subprocessId: string;
    subprocessCode: string;
    subprocessLabel: string;
    contextNote: string | null;
}

interface InContext extends LocalBaseRow {
    organizationSubprocessScopeId: string;
    subprocessId: string;
    subprocessCode: string;
    subprocessLabel: string;
    contextStatus: LocalStatus;
}

interface Sourced extends InContext {
    sourceType: LocalSource;
    centralReferenceStatus: LocalStatus | null;
    centralReferenceValidFrom: string | null;
    centralReferenceValidTo: string | null;
}

export interface LocalControlRow extends Sourced {
    controlId: string;
    controlCode: string;
    controlLabel: string;
    centralControlScopeId: string | null;
    actualOwnerId: string | null;
    actualOwnerLabel: string | null;
    frequencyCode: string | null;
    executionMethodCode: string | null;
    testMethodCode: string | null;
    localContextNote: string | null;
}

export interface LocalRiskRow extends Sourced {
    riskTemplateId: string;
    riskTemplateCode: string;
    riskTemplateLabel: string;
    centralRiskScopeId: string | null;
}

export interface LocalObjectiveRow extends Sourced {
    controlObjectiveId: string;
    controlObjectiveCode: string;
    controlObjectiveLabel: string;
    centralControlObjectiveScopeId: string | null;
}

export interface LocalRequirementRow extends Sourced {
    requirementId: string;
    requirementCode: string;
    requirementLabel: string;
    centralRequirementScopeId: string | null;
    regulationId: string;
    regulationCode: string;
    regulationLabel: string;
    regulationGroupId: string;
    regulationGroupCode: string;
    regulationGroupLabel: string;
}

interface Coverage extends Sourced {
    coverageNote: string | null;
}

export interface LocalRiskControlCoverageRow extends Coverage {
    localRiskScopeId: string;
    localRiskScopeStatus: LocalStatus;
    riskTemplateId: string;
    riskTemplateCode: string;
    riskTemplateLabel: string;
    localControlScopeId: string;
    localControlScopeStatus: LocalStatus;
    controlId: string;
    controlCode: string;
    controlLabel: string;
    centralRiskControlCoverageId: string | null;
}
export interface LocalRiskObjectiveCoverageRow extends Coverage {
    localRiskScopeId: string;
    localRiskScopeStatus: LocalStatus;
    riskTemplateId: string;
    riskTemplateCode: string;
    riskTemplateLabel: string;
    localControlObjectiveScopeId: string;
    localControlObjectiveScopeStatus: LocalStatus;
    controlObjectiveId: string;
    controlObjectiveCode: string;
    controlObjectiveLabel: string;
    centralRiskControlObjectiveCoverageId: string | null;
}
export interface LocalControlObjectiveCoverageRow extends Coverage {
    localControlScopeId: string;
    localControlScopeStatus: LocalStatus;
    controlId: string;
    controlCode: string;
    controlLabel: string;
    localControlObjectiveScopeId: string;
    localControlObjectiveScopeStatus: LocalStatus;
    controlObjectiveId: string;
    controlObjectiveCode: string;
    controlObjectiveLabel: string;
    centralControlControlObjectiveCoverageId: string | null;
}
export interface LocalRequirementControlCoverageRow extends Coverage {
    localRequirementScopeId: string;
    localRequirementScopeStatus: LocalStatus;
    requirementId: string;
    requirementCode: string;
    requirementLabel: string;
    regulationId: string;
    regulationCode: string;
    regulationLabel: string;
    regulationGroupId: string;
    regulationGroupCode: string;
    regulationGroupLabel: string;
    localControlScopeId: string;
    localControlScopeStatus: LocalStatus;
    controlId: string;
    controlCode: string;
    controlLabel: string;
    centralRequirementControlCoverageId: string | null;
}

interface Policy extends LocalBaseRow {
    policyId: string;
    policyCode: string;
    policyLabel: string;
    scopeAction: LocalAction;
}
export interface LocalOrganizationPolicyRow extends Policy {
    propagationMode: LocalPropagation;
}
export interface LocalContextPolicyRow extends Policy, InContext {}
export interface LocalControlPolicyRow extends Policy, InContext {
    localControlScopeId: string;
    controlId: string;
    controlCode: string;
    controlLabel: string;
    targetStatus: LocalStatus;
}
export interface LocalRequirementPolicyRow extends Policy, InContext {
    localRequirementScopeId: string;
    requirementId: string;
    requirementCode: string;
    requirementLabel: string;
    regulationId: string;
    regulationCode: string;
    regulationLabel: string;
    regulationGroupId: string;
    regulationGroupCode: string;
    regulationGroupLabel: string;
    targetStatus: LocalStatus;
}

export interface LocalRows {
    contexts: LocalContextRow;
    "control-scopes": LocalControlRow;
    "risk-scopes": LocalRiskRow;
    "control-objective-scopes": LocalObjectiveRow;
    "requirement-scopes": LocalRequirementRow;
    "risk-control-coverages": LocalRiskControlCoverageRow;
    "risk-control-objective-coverages": LocalRiskObjectiveCoverageRow;
    "control-control-objective-coverages": LocalControlObjectiveCoverageRow;
    "requirement-control-coverages": LocalRequirementControlCoverageRow;
    "organization-policies": LocalOrganizationPolicyRow;
    "context-policies": LocalContextPolicyRow;
    "control-policies": LocalControlPolicyRow;
    "requirement-policies": LocalRequirementPolicyRow;
}

export interface LocalPage<T> {
    items: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}
export interface LocalMutation<T> {
    entityId: string;
    version: number;
    revisionId: string;
    row: T;
}
export interface LocalOption {
    id: string;
    code?: string;
    displayLabel?: string;
    definitionCode?: string;
    definitionLabel?: string;
    leftDefinitionCode?: string;
    rightDefinitionCode?: string;
    subprocessCode?: string;
    subprocessLabel?: string;
    controlCode?: string;
    controlLabel?: string;
    riskTemplateCode?: string;
    riskTemplateLabel?: string;
    controlObjectiveCode?: string;
    controlObjectiveLabel?: string;
    requirementCode?: string;
    requirementLabel?: string;
}

export const LOCAL_DOCUMENT_TARGETS: Record<LocalSectionKey, DocumentLinkTargetType> = {
    contexts: "LOCAL_CONTEXT",
    "control-scopes": "LOCAL_CONTROL_SCOPE",
    "risk-scopes": "LOCAL_RISK_SCOPE",
    "control-objective-scopes": "LOCAL_OBJECTIVE_SCOPE",
    "requirement-scopes": "LOCAL_REQUIREMENT_SCOPE",
    "risk-control-coverages": "LOCAL_RISK_CONTROL_COV",
    "risk-control-objective-coverages": "LOCAL_RISK_OBJECTIVE_COV",
    "control-control-objective-coverages": "LOCAL_CONTROL_OBJECTIVE_COV",
    "requirement-control-coverages": "LOCAL_REQUIREMENT_CONTROL_COV",
    "organization-policies": "LOCAL_POLICY_ORG",
    "context-policies": "LOCAL_POLICY_SUBPROCESS",
    "control-policies": "LOCAL_POLICY_CONTROL",
    "requirement-policies": "LOCAL_POLICY_REQUIREMENT",
};
