import type {
    ProcessObjectiveAssignment,
    ProcessObjectiveAssignmentCreate,
} from "../domain/process-objective-assignment.model";

export interface ProcessObjectiveAssignmentRepo {
    listByProcess(processNodeId: string): Promise<ProcessObjectiveAssignment[]>;
    create(payload: ProcessObjectiveAssignmentCreate): Promise<ProcessObjectiveAssignment>;
    remove(id: string): Promise<void>;
}
