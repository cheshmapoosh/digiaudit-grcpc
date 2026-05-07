import { httpClient } from "@/shared/infra/http.client";
import type {
    RiskNode,
    RiskNodeCreate,
    RiskNodeUpdate,
} from "../domain/risk.model";
import type { RiskRepo } from "./risk.repo";

const BASE_URL = "/api/risks";

export class RiskApiRepo implements RiskRepo {
    async list(): Promise<RiskNode[]> {
        return httpClient.get<RiskNode[]>(BASE_URL);
    }

    async getById(id: string): Promise<RiskNode | null> {
        try {
            return await httpClient.get<RiskNode>(`${BASE_URL}/${id}`);
        } catch {
            return null;
        }
    }

    async create(payload: RiskNodeCreate): Promise<RiskNode> {
        return httpClient.post<RiskNode>(BASE_URL, payload);
    }

    async update(id: string, payload: RiskNodeUpdate): Promise<RiskNode> {
        return httpClient.put<RiskNode>(`${BASE_URL}/${id}`, payload);
    }

    async remove(id: string): Promise<void> {
        await httpClient.delete<void>(`${BASE_URL}/${id}`);
    }

    async getChildren(parentId: string | null): Promise<RiskNode[]> {
        const url = parentId ? `${BASE_URL}/children/${parentId}` : `${BASE_URL}/roots`;
        return httpClient.get<RiskNode[]>(url);
    }

    async toggleStatus(id: string): Promise<RiskNode> {
        return httpClient.patch<RiskNode>(`${BASE_URL}/${id}/toggle-status`, {});
    }
}
