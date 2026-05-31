import { httpClient } from "@/shared/infra/http.client";
import type {
    ProcessObjectiveAssignment,
    ProcessObjectiveAssignmentCreate,
} from "../domain/process-objective-assignment.model";
import type { ProcessObjectiveAssignmentRepo } from "./process-objective-assignment.repo";

const PROCESSES_URL = "/api/processes";
const ASSIGNMENTS_URL = "/api/process-objective-assignments";

export class ProcessObjectiveAssignmentApiRepo
    implements ProcessObjectiveAssignmentRepo
{
    async listByProcess(processNodeId: string): Promise<ProcessObjectiveAssignment[]> {
        return httpClient.get<ProcessObjectiveAssignment[]>(
            `${PROCESSES_URL}/${processNodeId}/objective-assignments`,
        );
    }

    async create(
        payload: ProcessObjectiveAssignmentCreate,
    ): Promise<ProcessObjectiveAssignment> {
        return httpClient.post<ProcessObjectiveAssignment>(ASSIGNMENTS_URL, payload);
    }

    async remove(id: string): Promise<void> {
        await httpClient.delete<void>(`${ASSIGNMENTS_URL}/${id}`);
    }
}
