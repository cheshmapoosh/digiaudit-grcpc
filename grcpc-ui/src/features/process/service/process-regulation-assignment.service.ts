import type {
    ProcessRegulationAssignment,
    ProcessRegulationAssignmentCreate,
} from "../domain/process-regulation-assignment.model";
import { createProcessRegulationAssignmentRepo } from "../infra/process-regulation-assignment.factory";
import type { ProcessRegulationAssignmentRepo } from "../infra/process-regulation-assignment.repo";

export interface ProcessRegulationAssignmentService {
    listByProcess(processNodeId: string): Promise<ProcessRegulationAssignment[]>;
    create(payload: ProcessRegulationAssignmentCreate): Promise<ProcessRegulationAssignment>;
    remove(id: string): Promise<void>;
}

export function createProcessRegulationAssignmentService(
    repo: ProcessRegulationAssignmentRepo,
): ProcessRegulationAssignmentService {
    return {
        async listByProcess(processNodeId) {
            return repo.listByProcess(processNodeId);
        },

        async create(payload) {
            return repo.create({
                ...payload,
                isActive: payload.isActive ?? true,
            });
        },

        async remove(id) {
            await repo.remove(id);
        },
    };
}

const processRegulationAssignmentRepo = createProcessRegulationAssignmentRepo();

export const processRegulationAssignmentService =
    createProcessRegulationAssignmentService(processRegulationAssignmentRepo);
