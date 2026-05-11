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
