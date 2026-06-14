import { httpClient } from "@/shared/infra/http.client";
import type {
    ProcessRiskAssignment,
    ProcessRiskAssignmentCreate,
} from "../domain/process-risk-assignment.model";
import type { ProcessRiskAssignmentRepo } from "./process-risk-assignment.repo";

const PROCESSES_URL = "/api/processes";
const ASSIGNMENTS_URL = "/api/process-risk-assignments";

export class ProcessRiskAssignmentApiRepo implements ProcessRiskAssignmentRepo {
    async listByProcess(processNodeId: string): Promise<ProcessRiskAssignment[]> {
        return httpClient.get<ProcessRiskAssignment[]>(
            `${PROCESSES_URL}/${processNodeId}/risk-assignments`,
        );
    }

    async create(payload: ProcessRiskAssignmentCreate): Promise<ProcessRiskAssignment> {
        return httpClient.post<ProcessRiskAssignment>(ASSIGNMENTS_URL, payload);
    }

    async remove(id: string): Promise<void> {
        await httpClient.delete<void>(`${ASSIGNMENTS_URL}/${id}`);
    }
}
