import { httpClient } from "@/shared/infra/http.client";
import type {
    AccountGroupNode,
    AccountGroupNodeCreate,
    AccountGroupNodeUpdate,
} from "../domain/accountGroup.model";
import type { AccountGroupRepo } from "./accountGroup.repo";

const BASE_URL = "/api/account-groups";

export class AccountGroupApiRepo implements AccountGroupRepo {
    async list(): Promise<AccountGroupNode[]> {
        return httpClient.get<AccountGroupNode[]>(BASE_URL);
    }

    async getById(id: string): Promise<AccountGroupNode | null> {
        try {
            return await httpClient.get<AccountGroupNode>(`${BASE_URL}/${id}`);
        } catch {
            return null;
        }
    }

    async create(payload: AccountGroupNodeCreate): Promise<AccountGroupNode> {
        return httpClient.post<AccountGroupNode>(BASE_URL, payload);
    }

    async update(
        id: string,
        payload: AccountGroupNodeUpdate,
    ): Promise<AccountGroupNode> {
        return httpClient.put<AccountGroupNode>(`${BASE_URL}/${id}`, payload);
    }

    async remove(id: string): Promise<void> {
        await httpClient.delete<void>(`${BASE_URL}/${id}`);
    }

    async getChildren(parentId: string | null): Promise<AccountGroupNode[]> {
        const url = parentId ? `${BASE_URL}/children/${parentId}` : `${BASE_URL}/roots`;
        return httpClient.get<AccountGroupNode[]>(url);
    }

    async toggleStatus(id: string): Promise<AccountGroupNode> {
        return httpClient.patch<AccountGroupNode>(`${BASE_URL}/${id}/toggle-status`, {});
    }
}
