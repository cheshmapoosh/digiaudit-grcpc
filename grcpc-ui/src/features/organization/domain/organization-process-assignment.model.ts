import type { AuditFields } from "@/shared/domain/audit.model";

export type OrganizationProcessAssignmentType = "scope" | "owner" | "participant";

export interface OrganizationProcessAssignment extends AuditFields {
    id: string;
    organizationId: string;
    processNodeId: string;
    assignmentType: OrganizationProcessAssignmentType;
    validFrom?: string;
    validTo?: string;
    isActive: boolean;
}

export interface OrganizationProcessAssignmentCreate {
    organizationId: string;
    processNodeId: string;
    assignmentType?: OrganizationProcessAssignmentType;
    validFrom?: string;
    validTo?: string;
    isActive?: boolean;
}

export interface OrganizationSubProcessOption {
    processNodeId: string;
    code: string;
    title: string;
    parentProcessCode?: string;
    parentProcessTitle?: string;
    status: "active" | "inactive";
}

export interface OrganizationSubProcessView extends OrganizationSubProcessOption {
    assignmentId: string;
    organizationId: string;
    assignmentType: OrganizationProcessAssignmentType;
    validFrom?: string;
    validTo?: string;
    isActive: boolean;
    description?: string;
    controlsCount: number;
}

export interface OrganizationControlView {
    organizationId: string;
    processNodeId: string;
    subProcessCode: string;
    subProcessTitle: string;
    controlId: string;
    controlCode: string;
    controlTitle: string;
    controlDescription?: string;
    controlAutomation?: string;
    controlFrequency?: string;
    controlClassification?: string;
    controlOwner?: string;
    importance?: string;
    status: "active" | "inactive";
    processControlAssignmentId: string;
    assignmentType: OrganizationProcessAssignmentType;
    validFrom?: string;
    validTo?: string;
    isActive: boolean;
}

export interface OrganizationRiskAssignment {
    id: string;
    organizationId: string;
    processNodeId: string;
    subProcessCode: string;
    subProcessTitle: string;
    riskNodeId: string;
    riskCode: string;
    riskTitle: string;
    riskDescription?: string;
    riskType?: string;
    status: "active" | "inactive";
    assignmentType: OrganizationProcessAssignmentType;
    validFrom?: string;
    validTo?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string | null;
    updatedBy?: string | null;
}

export interface OrganizationRiskAssignmentCreate {
    organizationId: string;
    processNodeId: string;
    riskNodeId: string;
    assignmentType?: OrganizationProcessAssignmentType;
    validFrom?: string;
    validTo?: string;
    isActive?: boolean;
}

export interface OrganizationRiskOption {
    riskNodeId: string;
    code: string;
    title: string;
    riskType?: string;
    status: "active" | "inactive";
    description?: string;
}

export type OrganizationReferenceType =
    | "CONTROL"
    | "REGULATION"
    | "POLICY"
    | "OBJECTIVE";

export interface OrganizationReferenceAssignment extends AuditFields {
    id: string;
    organizationId: string;
    referenceType: OrganizationReferenceType;
    referenceId: string;
    assignmentType: OrganizationProcessAssignmentType;
    validFrom?: string;
    validTo?: string;
    isActive: boolean;
}

export interface OrganizationReferenceAssignmentCreate {
    organizationId: string;
    referenceType: OrganizationReferenceType;
    referenceId: string;
    assignmentType?: OrganizationProcessAssignmentType;
    validFrom?: string;
    validTo?: string;
    isActive?: boolean;
}

export interface OrganizationReferenceOption {
    referenceId: string;
    code: string;
    title: string;
    description?: string;
    status?: string;
    ownerName?: string;
    typeLabel?: string;
    parentCode?: string;
    parentTitle?: string;
    validFrom?: string;
    validTo?: string;
}

export interface OrganizationReferenceView extends OrganizationReferenceOption {
    assignmentId: string;
    organizationId: string;
    referenceType: OrganizationReferenceType;
    assignmentType: OrganizationProcessAssignmentType;
    isActive: boolean;
}
