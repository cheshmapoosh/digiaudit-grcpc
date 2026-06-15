import type {
    ProcessAccountGroupAssignment,
    ProcessAccountGroupAssignmentCreate,
} from "../domain/process-account-group-assignment.model";

export interface ProcessAccountGroupAssignmentRepo {
    listByProcess(processNodeId: string): Promise<ProcessAccountGroupAssignment[]>;
    create(payload: ProcessAccountGroupAssignmentCreate): Promise<ProcessAccountGroupAssignment>;
    remove(id: string): Promise<void>;
}
