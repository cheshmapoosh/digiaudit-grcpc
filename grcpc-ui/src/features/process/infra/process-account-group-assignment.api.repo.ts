import { httpClient } from "@/shared/infra/http.client";
import type {
    ProcessAccountGroupAssignment,
    ProcessAccountGroupAssignmentCreate,
} from "../domain/process-account-group-assignment.model";
import type { ProcessAccountGroupAssignmentRepo } from "./process-account-group-assignment.repo";

const PROCESSES_URL = "/api/processes";
const ASSIGNMENTS_URL = "/api/process-account-group-assignments";

export class ProcessAccountGroupAssignmentApiRepo
    implements ProcessAccountGroupAssignmentRepo
{
    async listByProcess(processNodeId: string): Promise<ProcessAccountGroupAssignment[]> {
        return httpClient.get<ProcessAccountGroupAssignment[]>(
            `${PROCESSES_URL}/${processNodeId}/account-group-assignments`,
        );
    }

    async create(
        payload: ProcessAccountGroupAssignmentCreate,
    ): Promise<ProcessAccountGroupAssignment> {
        return httpClient.post<ProcessAccountGroupAssignment>(ASSIGNMENTS_URL, payload);
    }

    async remove(id: string): Promise<void> {
        await httpClient.delete<void>(`${ASSIGNMENTS_URL}/${id}`);
    }
}
