import type {
    AttachExistingControlRequest,
    ControlDetails,
    ControlStructureNode,
    ControlSummary,
    CreateControlAndAssignRequest,
    UpdateControlAssignmentRequest,
} from "../domain/control.model";

export interface ControlRepo {
    getStructure(): Promise<ControlStructureNode[]>;
    list(): Promise<ControlSummary[]>;
    getAssignment(controlAssignmentId: string): Promise<ControlDetails>;
    createAndAssign(
        subProcessId: string,
        payload: CreateControlAndAssignRequest,
    ): Promise<ControlDetails>;
    attachExisting(
        subProcessId: string,
        payload: AttachExistingControlRequest,
    ): Promise<ControlDetails>;
    updateAssignment(
        controlAssignmentId: string,
        payload: UpdateControlAssignmentRequest,
    ): Promise<ControlDetails>;
    deleteAssignment(controlAssignmentId: string): Promise<void>;
}
