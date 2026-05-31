import type { AuditFields } from "@/shared/domain/audit.model";

export type ProcessAccountGroupAssignmentType = "scope" | "owner" | "participant";

export type ProcessAccountGroupAssignmentStatus = "active" | "inactive";

export interface ProcessAccountGroupAssignment extends AuditFields {
    assignmentId: string;
    processNodeId: string;
    accountGroupId: string;
    code: string;
    title: string;
    description?: string;
    status: ProcessAccountGroupAssignmentStatus;
    assignmentType: ProcessAccountGroupAssignmentType;
    validFrom?: string;
    validTo?: string;
    isActive: boolean;
}

export interface ProcessAccountGroupAssignmentCreate {
    processNodeId: string;
    accountGroupId: string;
    assignmentType?: ProcessAccountGroupAssignmentType;
    validFrom?: string;
    validTo?: string;
    isActive?: boolean;
}
