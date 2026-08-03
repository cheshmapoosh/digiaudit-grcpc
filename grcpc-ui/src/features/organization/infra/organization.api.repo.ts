import { httpClient } from "@/shared/infra/http.client";
import type {
    MasterDataRevisionMutationResponse,
    OrganizationLifecycleCommand,
    OrganizationMoveCommand,
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
} from "@/features/organization";
import type { OrganizationRepo } from "./organization.repo";

const BASE_URL = "/api/master-data/organizations";

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

    async create(
        payload: OrganizationNodeCreate,
    ): Promise<MasterDataRevisionMutationResponse> {
        return httpClient.post<MasterDataRevisionMutationResponse>(BASE_URL, payload);
    }

    async update(
        id: string,
        payload: OrganizationNodeUpdate,
    ): Promise<MasterDataRevisionMutationResponse> {
        return httpClient.patch<MasterDataRevisionMutationResponse>(
            `${BASE_URL}/${id}`,
            payload,
        );
    }

    async move(
        id: string,
        payload: OrganizationMoveCommand,
    ): Promise<MasterDataRevisionMutationResponse> {
        return httpClient.post<MasterDataRevisionMutationResponse>(
            `${BASE_URL}/${id}/move`,
            payload,
        );
    }

    async activate(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse> {
        return httpClient.post<MasterDataRevisionMutationResponse>(
            `${BASE_URL}/${id}/activate`,
            payload,
        );
    }

    async inactivate(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse> {
        return httpClient.post<MasterDataRevisionMutationResponse>(
            `${BASE_URL}/${id}/inactivate`,
            payload,
        );
    }

    async delete(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse> {
        return httpClient.post<MasterDataRevisionMutationResponse>(
            `${BASE_URL}/${id}/delete`,
            payload,
        );
    }

    async restore(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse> {
        return httpClient.post<MasterDataRevisionMutationResponse>(
            `${BASE_URL}/${id}/restore`,
            payload,
        );
    }
}
