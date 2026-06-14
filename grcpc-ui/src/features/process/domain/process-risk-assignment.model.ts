import type { AuditFields } from "@/shared/domain/audit.model";

export type ProcessRiskAssignmentType = "scope" | "owner" | "participant";

export type ProcessRiskAssignmentStatus = "active" | "inactive";

export interface ProcessRiskAssignment extends AuditFields {
    assignmentId: string;
    processNodeId: string;
    riskNodeId: string;
    code: string;
    title: string;
    description?: string | null;
    nodeType?: string | null;
    riskType?: string | null;
    status: ProcessRiskAssignmentStatus;
    assignmentType: ProcessRiskAssignmentType;
    validFrom?: string | null;
    validTo?: string | null;
    isActive: boolean;
}

export interface ProcessRiskAssignmentCreate {
    processNodeId: string;
    riskNodeId: string;
    assignmentType?: ProcessRiskAssignmentType;
    validFrom?: string;
    validTo?: string;
    isActive?: boolean;
}
