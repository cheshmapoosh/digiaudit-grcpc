import type {
    ProcessAccountGroupAssignment,
    ProcessAccountGroupAssignmentCreate,
} from "../domain/process-account-group-assignment.model";
import { createProcessAccountGroupAssignmentRepo } from "../infra/process-account-group-assignment.factory";
import type { ProcessAccountGroupAssignmentRepo } from "../infra/process-account-group-assignment.repo";

export interface ProcessAccountGroupAssignmentService {
    listByProcess(processNodeId: string): Promise<ProcessAccountGroupAssignment[]>;
    create(payload: ProcessAccountGroupAssignmentCreate): Promise<ProcessAccountGroupAssignment>;
    remove(id: string): Promise<void>;
}

export function createProcessAccountGroupAssignmentService(
    repo: ProcessAccountGroupAssignmentRepo,
): ProcessAccountGroupAssignmentService {
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

const processAccountGroupAssignmentRepo = createProcessAccountGroupAssignmentRepo();

export const processAccountGroupAssignmentService =
    createProcessAccountGroupAssignmentService(processAccountGroupAssignmentRepo);
