import type {
    MasterDataRevisionMutationResponse,
    OrganizationLifecycleCommand,
    OrganizationMoveCommand,
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
} from "@/features/organization";

export interface OrganizationRepo {
    list(lifecycleStatus?: "DELETED"): Promise<OrganizationNode[]>;
    getById(id: string): Promise<OrganizationNode | null>;
    create(payload: OrganizationNodeCreate): Promise<MasterDataRevisionMutationResponse>;
    update(
        id: string,
        payload: OrganizationNodeUpdate,
    ): Promise<MasterDataRevisionMutationResponse>;
    move(
        id: string,
        payload: OrganizationMoveCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    activate(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    inactivate(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    delete(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    restore(
        id: string,
        payload: OrganizationLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
}
