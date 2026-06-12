import { httpClient } from "@/shared/infra/http.client";
import type {
    AttachExistingControlRequest,
    ControlDetails,
    ControlStructureNode,
    ControlSummary,
    CreateControlAndAssignRequest,
    UpdateControlAssignmentRequest,
} from "../domain/control.model";
import type { ControlRepo } from "./control.repo";

const BASE_URL = "/api/controls";

export class ControlApiRepo implements ControlRepo {
    async getStructure(): Promise<ControlStructureNode[]> {
        return httpClient.get<ControlStructureNode[]>("/api/control-structure");
    }

    async list(): Promise<ControlSummary[]> {
        return httpClient.get<ControlSummary[]>(BASE_URL);
    }

    async getAssignment(controlAssignmentId: string): Promise<ControlDetails> {
        return httpClient.get<ControlDetails>(`/api/control-assignments/${controlAssignmentId}`);
    }

    async createAndAssign(
        subProcessId: string,
        payload: CreateControlAndAssignRequest,
    ): Promise<ControlDetails> {
        return httpClient.post<ControlDetails>(
            `/api/sub-processes/${subProcessId}/controls`,
            payload,
        );
    }

    async attachExisting(
        subProcessId: string,
        payload: AttachExistingControlRequest,
    ): Promise<ControlDetails> {
        return httpClient.post<ControlDetails>(
            `/api/sub-processes/${subProcessId}/control-assignments`,
            payload,
        );
    }

    async updateAssignment(
        controlAssignmentId: string,
        payload: UpdateControlAssignmentRequest,
    ): Promise<ControlDetails> {
        return httpClient.put<ControlDetails>(
            `/api/control-assignments/${controlAssignmentId}`,
            payload,
        );
    }

    async deleteAssignment(controlAssignmentId: string): Promise<void> {
        await httpClient.delete<void>(`/api/control-assignments/${controlAssignmentId}`);
    }
}
