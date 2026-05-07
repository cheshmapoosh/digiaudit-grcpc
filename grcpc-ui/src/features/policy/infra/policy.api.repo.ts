import { httpClient } from "@/shared/infra/http.client";
import type {
    PolicyNode,
    PolicyNodeCreate,
    PolicyNodeUpdate,
} from "../domain/policy.model";
import type { PolicyRepo } from "./policy.repo";

const BASE_URL = "/api/policies";

export class PolicyApiRepo implements PolicyRepo {
    async list(): Promise<PolicyNode[]> {
        return httpClient.get<PolicyNode[]>(BASE_URL);
    }

    async getById(id: string): Promise<PolicyNode | null> {
        try {
            return await httpClient.get<PolicyNode>(`${BASE_URL}/${id}`);
        } catch {
            return null;
        }
    }

    async create(payload: PolicyNodeCreate): Promise<PolicyNode> {
        return httpClient.post<PolicyNode>(BASE_URL, payload);
    }

    async update(id: string, payload: PolicyNodeUpdate): Promise<PolicyNode> {
        return httpClient.put<PolicyNode>(`${BASE_URL}/${id}`, payload);
    }

    async remove(id: string): Promise<void> {
        await httpClient.delete<void>(`${BASE_URL}/${id}`);
    }

    async getChildren(parentId: string | null): Promise<PolicyNode[]> {
        const url = parentId ? `${BASE_URL}/children/${parentId}` : `${BASE_URL}/roots`;
        return httpClient.get<PolicyNode[]>(url);
    }

    async toggleStatus(id: string): Promise<PolicyNode> {
        return httpClient.patch<PolicyNode>(`${BASE_URL}/${id}/toggle-status`, {});
    }
}
