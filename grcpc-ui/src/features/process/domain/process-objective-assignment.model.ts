import type { AuditFields } from "@/shared/domain/audit.model";

export type ProcessObjectiveAssignmentType = "scope" | "owner" | "participant";

export type ProcessObjectiveAssignmentStatus = "active" | "inactive";

export interface ProcessObjectiveAssignment extends AuditFields {
    assignmentId: string;
    processNodeId: string;
    objectiveNodeId: string;
    code: string;
    title: string;
    description?: string;
    status: ProcessObjectiveAssignmentStatus;
    assignmentType: ProcessObjectiveAssignmentType;
    validFrom?: string;
    validTo?: string;
    isActive: boolean;
}

export interface ProcessObjectiveAssignmentCreate {
    processNodeId: string;
    objectiveNodeId: string;
    assignmentType?: ProcessObjectiveAssignmentType;
    validFrom?: string;
    validTo?: string;
    isActive?: boolean;
}
