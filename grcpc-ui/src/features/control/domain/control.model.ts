export type ControlStatus = "active" | "inactive";

export type ControlAssignmentStatus = "active" | "inactive";

export type ControlStructureNodeType = "process" | "subProcess" | "control";

export type ControlNature = "preventive" | "detective";

export type ControlAutomationType = "manual" | "system" | "semiManualSystem";

export type ControlImportance = "low" | "medium" | "high" | "critical";

export interface ControlSummary {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    controlClass?: string | null;
    controlNature?: ControlNature | null;
    automationType?: ControlAutomationType | null;
    importance?: ControlImportance | null;
    objective?: string | null;
    status: ControlStatus;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface ControlStructureNode {
    id: string;
    nodeType: ControlStructureNodeType;
    code: string;
    title: string;
    description?: string | null;
    parentId: string | null;
    processId?: string | null;
    subProcessId?: string | null;
    controlId?: string | null;
    controlAssignmentId?: string | null;
    status: ControlStatus;
    sortOrder?: number | null;
    ownerId?: string | null;
    ownerName?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
}

export interface ControlDetails {
    controlAssignmentId: string;
    controlId: string;
    code: string;
    name: string;
    description?: string | null;
    controlClass?: string | null;
    controlNature?: ControlNature | null;
    automationType?: ControlAutomationType | null;
    importance?: ControlImportance | null;
    objective?: string | null;
    parentProcessId?: string | null;
    parentProcessTitle?: string | null;
    parentSubProcessId: string;
    parentSubProcessTitle: string;
    ownerId?: string | null;
    ownerName?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
    sortOrder?: number | null;
    operationPeriod?: string | null;
    testMethod?: string | null;
    testPlan?: string | null;
    status: ControlStatus;
    assignmentStatus: ControlAssignmentStatus;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface CreateControlAndAssignRequest {
    code: string;
    name: string;
    description?: string | null;
    controlClass?: string | null;
    controlNature?: ControlNature | null;
    automationType?: ControlAutomationType | null;
    importance?: ControlImportance | null;
    objective?: string | null;
    ownerId?: string | null;
    ownerName?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
    sortOrder?: number | null;
    operationPeriod?: string | null;
    testMethod?: string | null;
    testPlan?: string | null;
}

export interface AttachExistingControlRequest {
    controlId: string;
    ownerId?: string | null;
    ownerName?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
    sortOrder?: number | null;
    operationPeriod?: string | null;
    testMethod?: string | null;
    testPlan?: string | null;
}

export interface UpdateControlAssignmentRequest {
    ownerId?: string | null;
    ownerName?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
    sortOrder?: number | null;
    operationPeriod?: string | null;
    testMethod?: string | null;
    testPlan?: string | null;
    assignmentStatus: ControlAssignmentStatus;
}

export interface ControlStep {
    id: string;
    controlAssignmentId: string;
    title: string;
    description?: string | null;
    requiredDocument?: string | null;
    requiredNote?: string | null;
    sensitivity?: string | null;
    sortOrder?: number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface CreateControlStepRequest {
    title: string;
    description?: string | null;
    requiredDocument?: string | null;
    requiredNote?: string | null;
    sensitivity?: string | null;
    sortOrder?: number | null;
}

export type UpdateControlStepRequest = CreateControlStepRequest;

export interface ControlRegulationLink {
    id: string;
    controlAssignmentId: string;
    regulationId: string;
    code?: string | null;
    title?: string | null;
    description?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface ControlRequirementLink {
    id: string;
    controlAssignmentId: string;
    requirementId: string;
    regulationId?: string | null;
    code?: string | null;
    title?: string | null;
    description?: string | null;
    regulationTitle?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface ControlRiskLink {
    id: string;
    controlAssignmentId: string;
    riskId: string;
    code?: string | null;
    title?: string | null;
    description?: string | null;
    source?: string | null;
    organizationTitle?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface ControlAccountGroupLink {
    id: string;
    controlAssignmentId: string;
    accountGroupId: string;
    code?: string | null;
    title?: string | null;
    description?: string | null;
    assertionType?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface ControlDocument {
    id: string;
    controlAssignmentId: string;
    name: string;
    documentType?: string | null;
    description?: string | null;
    fileRef?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface CreateControlDocumentRequest {
    name: string;
    documentType?: string | null;
    description?: string | null;
    fileRef?: string | null;
}

export type UpdateControlDocumentRequest = CreateControlDocumentRequest;

export interface ControlPerformancePlan {
    id: string;
    controlAssignmentId: string;
    title: string;
    description?: string | null;
    frequency?: string | null;
    ownerName?: string | null;
    plannedDate?: string | null;
    status?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface CreateControlPerformancePlanRequest {
    title: string;
    description?: string | null;
    frequency?: string | null;
    ownerName?: string | null;
    plannedDate?: string | null;
    status?: string | null;
}

export type UpdateControlPerformancePlanRequest = CreateControlPerformancePlanRequest;
