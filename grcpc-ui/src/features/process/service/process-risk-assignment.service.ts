import type {
    ProcessRiskAssignment,
    ProcessRiskAssignmentCreate,
} from "../domain/process-risk-assignment.model";
import { createProcessRiskAssignmentRepo } from "../infra/process-risk-assignment.factory";
import type { ProcessRiskAssignmentRepo } from "../infra/process-risk-assignment.repo";

export interface ProcessRiskAssignmentService {
    listByProcess(processNodeId: string): Promise<ProcessRiskAssignment[]>;
    create(payload: ProcessRiskAssignmentCreate): Promise<ProcessRiskAssignment>;
    remove(id: string): Promise<void>;
}

export function createProcessRiskAssignmentService(
    repo: ProcessRiskAssignmentRepo,
): ProcessRiskAssignmentService {
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

const processRiskAssignmentRepo = createProcessRiskAssignmentRepo();

export const processRiskAssignmentService =
    createProcessRiskAssignmentService(processRiskAssignmentRepo);
