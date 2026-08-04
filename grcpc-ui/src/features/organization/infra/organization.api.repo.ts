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

function toCreateBody(payload: OrganizationNodeCreate) {
    return {
        code: payload.code,
        name: payload.name,
        organizationType: payload.organizationType,
        parentOrganizationId: payload.parentOrganizationId ?? null,
        location: payload.location ?? null,
        description: payload.description ?? null,
        validFrom: payload.validFrom ?? null,
        validTo: payload.validTo ?? null,
    };
}

function toUpdateBody(payload: OrganizationNodeUpdate) {
    return {
        version: payload.version,
        name: payload.name,
        organizationType: payload.organizationType,
        status: payload.status,
        location: payload.location ?? null,
        description: payload.description ?? null,
        validFrom: payload.validFrom ?? null,
        validTo: payload.validTo ?? null,
    };
}

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
        return httpClient.post<MasterDataRevisionMutationResponse>(BASE_URL, toCreateBody(payload));
    }

    async update(
        id: string,
        payload: OrganizationNodeUpdate,
    ): Promise<MasterDataRevisionMutationResponse> {
        return httpClient.patch<MasterDataRevisionMutationResponse>(
            `${BASE_URL}/${id}`,
            toUpdateBody(payload),
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

    async delete(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse> {
        return httpClient.post<MasterDataRevisionMutationResponse>(
            `${BASE_URL}/${id}/delete`,
            payload,
        );
    }

}
