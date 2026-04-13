import { httpClient } from "@/shared/infra/http.client";
import type {
    RegulationNode,
    RegulationNodeCreate,
    RegulationNodeUpdate,
} from "@/features/regulation";
import type { RegulationRepo } from "./regulation.repo";

const BASE_URL = "/api/regulations";

export class RegulationApiRepo implements RegulationRepo {
    async list(): Promise<RegulationNode[]> {
        return httpClient.get<RegulationNode[]>(BASE_URL);
    }

    async getById(id: string): Promise<RegulationNode | null> {
        try {
            return await httpClient.get<RegulationNode>(`${BASE_URL}/${id}`);
        } catch {
            return null;
        }
    }

    async create(payload: RegulationNodeCreate): Promise<RegulationNode> {
        return httpClient.post<RegulationNode>(BASE_URL, payload);
    }

    async update(
        id: string,
        payload: RegulationNodeUpdate,
    ): Promise<RegulationNode> {
        return httpClient.put<RegulationNode>(`${BASE_URL}/${id}`, payload);
    }

    async remove(id: string): Promise<void> {
        await httpClient.delete<void>(`${BASE_URL}/${id}`);
    }

    async getChildren(parentId: string | null): Promise<RegulationNode[]> {
        const url = parentId
            ? `${BASE_URL}/children/${parentId}`
            : `${BASE_URL}/roots`;

        return httpClient.get<RegulationNode[]>(url);
    }

    async toggleStatus(id: string): Promise<RegulationNode> {
        return httpClient.patch<RegulationNode>(
            `${BASE_URL}/${id}/toggle-status`,
            {},
        );
    }
}