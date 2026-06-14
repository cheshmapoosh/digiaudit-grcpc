import type { AuditFields } from "@/shared/domain/audit.model";

export type ProcessRegulationAssignmentStatus = "active" | "inactive";

export interface ProcessRegulationAssignment extends AuditFields {
    assignmentId: string;
    processNodeId: string;
    regulationNodeId: string;
    code?: string | null;
    title?: string | null;
    description?: string | null;
    issuer?: string | null;
    status: ProcessRegulationAssignmentStatus;
    validFrom?: string | null;
    validTo?: string | null;
    isActive: boolean;
}

export interface ProcessRegulationAssignmentCreate {
    processNodeId: string;
    regulationNodeId: string;
    isActive?: boolean;
}
