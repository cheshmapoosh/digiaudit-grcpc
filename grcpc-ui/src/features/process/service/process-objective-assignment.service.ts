import type {
    ProcessObjectiveAssignment,
    ProcessObjectiveAssignmentCreate,
} from "../domain/process-objective-assignment.model";
import { createProcessObjectiveAssignmentRepo } from "../infra/process-objective-assignment.factory";
import type { ProcessObjectiveAssignmentRepo } from "../infra/process-objective-assignment.repo";

export interface ProcessObjectiveAssignmentService {
    listByProcess(processNodeId: string): Promise<ProcessObjectiveAssignment[]>;
    create(payload: ProcessObjectiveAssignmentCreate): Promise<ProcessObjectiveAssignment>;
    remove(id: string): Promise<void>;
}

export function createProcessObjectiveAssignmentService(
    repo: ProcessObjectiveAssignmentRepo,
): ProcessObjectiveAssignmentService {
    return {
        async listByProcess(processNodeId) {
            return repo.listByProcess(processNodeId);
        },

        async create(payload) {
            return repo.create({
                ...payload,
                assignmentType: payload.assignmentType ?? "scope",
                isActive: payload.isActive ?? true,
            });
        },

        async remove(id) {
            await repo.remove(id);
        },
    };
}

const processObjectiveAssignmentRepo = createProcessObjectiveAssignmentRepo();

export const processObjectiveAssignmentService =
    createProcessObjectiveAssignmentService(processObjectiveAssignmentRepo);
