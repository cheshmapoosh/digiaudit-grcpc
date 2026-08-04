import { httpClient } from "@/shared/infra/http.client";
import type {
    MasterDataAggregateMutationResponse,
    MasterDataRevisionMutationResponse,
    OrganizationLifecycleCommand,
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
        documents: payload.documents,
    };
}

function toUpdateBody(payload: OrganizationNodeUpdate) {
    return {
        version: payload.version,
        name: payload.name,
        organizationType: payload.organizationType,
        status: payload.status,
        parentOrganizationId: payload.parentOrganizationId ?? null,
        location: payload.location ?? null,
        description: payload.description ?? null,
        validFrom: payload.validFrom ?? null,
        validTo: payload.validTo ?? null,
        documents: payload.documents,
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
    ): Promise<MasterDataAggregateMutationResponse> {
        return httpClient.post<MasterDataAggregateMutationResponse>(BASE_URL, toCreateBody(payload));
    }

    async update(
        id: string,
        payload: OrganizationNodeUpdate,
    ): Promise<MasterDataAggregateMutationResponse> {
        return httpClient.patch<MasterDataAggregateMutationResponse>(
            `${BASE_URL}/${id}`,
            toUpdateBody(payload),
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
