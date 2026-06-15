import type {
    ProcessRegulationAssignment,
    ProcessRegulationAssignmentCreate,
} from "../domain/process-regulation-assignment.model";

export interface ProcessRegulationAssignmentRepo {
    listByProcess(processNodeId: string): Promise<ProcessRegulationAssignment[]>;
    create(payload: ProcessRegulationAssignmentCreate): Promise<ProcessRegulationAssignment>;
    remove(id: string): Promise<void>;
}
