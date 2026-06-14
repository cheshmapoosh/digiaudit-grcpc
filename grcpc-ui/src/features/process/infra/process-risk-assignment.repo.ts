import type {
    ProcessRiskAssignment,
    ProcessRiskAssignmentCreate,
} from "../domain/process-risk-assignment.model";

export interface ProcessRiskAssignmentRepo {
    listByProcess(processNodeId: string): Promise<ProcessRiskAssignment[]>;
    create(payload: ProcessRiskAssignmentCreate): Promise<ProcessRiskAssignment>;
    remove(id: string): Promise<void>;
}
