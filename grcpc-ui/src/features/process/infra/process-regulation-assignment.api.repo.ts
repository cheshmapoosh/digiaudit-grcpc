import { httpClient } from "@/shared/infra/http.client";
import type {
    ProcessRegulationAssignment,
    ProcessRegulationAssignmentCreate,
} from "../domain/process-regulation-assignment.model";
import type { ProcessRegulationAssignmentRepo } from "./process-regulation-assignment.repo";

const PROCESSES_URL = "/api/processes";
const ASSIGNMENTS_URL = "/api/process-regulation-assignments";

export class ProcessRegulationAssignmentApiRepo
    implements ProcessRegulationAssignmentRepo
{
    async listByProcess(processNodeId: string): Promise<ProcessRegulationAssignment[]> {
        return httpClient.get<ProcessRegulationAssignment[]>(
            `${PROCESSES_URL}/${processNodeId}/regulation-assignments`,
        );
    }

    async create(
        payload: ProcessRegulationAssignmentCreate,
    ): Promise<ProcessRegulationAssignment> {
        return httpClient.post<ProcessRegulationAssignment>(ASSIGNMENTS_URL, payload);
    }

    async remove(id: string): Promise<void> {
        await httpClient.delete<void>(`${ASSIGNMENTS_URL}/${id}`);
    }
}
