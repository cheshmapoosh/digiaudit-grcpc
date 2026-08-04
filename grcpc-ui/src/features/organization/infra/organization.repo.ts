import type {
    MasterDataAggregateMutationResponse,
    MasterDataRevisionMutationResponse,
    OrganizationLifecycleCommand,
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
} from "@/features/organization";

export interface OrganizationRepo {
    list(): Promise<OrganizationNode[]>;
    getById(id: string): Promise<OrganizationNode | null>;
    create(payload: OrganizationNodeCreate): Promise<MasterDataAggregateMutationResponse>;
    update(
        id: string,
        payload: OrganizationNodeUpdate,
    ): Promise<MasterDataAggregateMutationResponse>;
    delete(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
}
