import type {
    MasterDataAggregateMutationResponse,
    MasterDataRevisionMutationResponse,
    OrganizationLifecycleCommand,
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
    OrganizationOwnerOption,
} from "@/features/organization";

export interface OrganizationRepo {
    ownerOptions(): Promise<OrganizationOwnerOption[]>;
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
