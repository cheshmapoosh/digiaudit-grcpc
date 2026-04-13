import { httpClient } from "@/shared/infra/http.client";
import type {
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
} from "@/features/organization";
import type { OrganizationRepo } from "./organization.repo";

const BASE_URL = "/api/organizations";

export class OrganizationApiRepo implements OrganizationRepo {
    async list(): Promise<OrganizationNode[]> {
        return httpClient.get<OrganizationNode[]>(BASE_URL);
    }

    async getById(id: string): Promise<OrganizationNode | null> {
        try {
            return await httpClient.get<OrganizationNode>(`${BASE_URL}/${id}`);
        } catch {
            return null;
        }
    }

    async create(payload: OrganizationNodeCreate): Promise<OrganizationNode> {
        return httpClient.post<OrganizationNode>(BASE_URL, payload);
    }

    async update(
        id: string,
        payload: OrganizationNodeUpdate,
    ): Promise<OrganizationNode> {
        return httpClient.put<OrganizationNode>(`${BASE_URL}/${id}`, payload);
    }

    async remove(id: string): Promise<void> {
        await httpClient.delete<void>(`${BASE_URL}/${id}`);
    }

    async getChildren(parentId: string | null): Promise<OrganizationNode[]> {
        const url = parentId
            ? `${BASE_URL}/children/${parentId}`
            : `${BASE_URL}/roots`;

        return httpClient.get<OrganizationNode[]>(url);
    }

    async toggleStatus(id: string): Promise<OrganizationNode> {
        return httpClient.patch<OrganizationNode>(
            `${BASE_URL}/${id}/toggle-status`,
            {},
        );
    }
}