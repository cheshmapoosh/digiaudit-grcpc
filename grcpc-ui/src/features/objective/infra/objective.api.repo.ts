import { httpClient } from "@/shared/infra/http.client";
import type {
    ObjectiveNode,
    ObjectiveNodeCreate,
    ObjectiveNodeUpdate,
} from "../domain/objective.model";
import type { ObjectiveRepo } from "./objective.repo";

const BASE_URL = "/api/objectives";

export class ObjectiveApiRepo implements ObjectiveRepo {
    async list(): Promise<ObjectiveNode[]> {
        return httpClient.get<ObjectiveNode[]>(BASE_URL);
    }

    async getById(id: string): Promise<ObjectiveNode | null> {
        try {
            return await httpClient.get<ObjectiveNode>(`${BASE_URL}/${id}`);
        } catch {
            return null;
        }
    }

    async create(payload: ObjectiveNodeCreate): Promise<ObjectiveNode> {
        return httpClient.post<ObjectiveNode>(BASE_URL, payload);
    }

    async update(id: string, payload: ObjectiveNodeUpdate): Promise<ObjectiveNode> {
        return httpClient.put<ObjectiveNode>(`${BASE_URL}/${id}`, payload);
    }

    async remove(id: string): Promise<void> {
        await httpClient.delete<void>(`${BASE_URL}/${id}`);
    }

    async getChildren(parentId: string | null): Promise<ObjectiveNode[]> {
        const url = parentId ? `${BASE_URL}/children/${parentId}` : `${BASE_URL}/roots`;
        return httpClient.get<ObjectiveNode[]>(url);
    }

    async toggleStatus(id: string): Promise<ObjectiveNode> {
        return httpClient.patch<ObjectiveNode>(`${BASE_URL}/${id}/toggle-status`, {});
    }
}
