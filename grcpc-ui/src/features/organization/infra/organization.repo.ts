import type {
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
} from "@/features/organization";

export interface OrganizationRepo {
    list(): Promise<OrganizationNode[]>;
    getById(id: string): Promise<OrganizationNode | null>;
    create(payload: OrganizationNodeCreate): Promise<OrganizationNode>;
    update(id: string, payload: OrganizationNodeUpdate): Promise<OrganizationNode>;
    remove(id: string): Promise<void>;
    getChildren(parentId: string | null): Promise<OrganizationNode[]>;
    toggleStatus(id: string): Promise<OrganizationNode>;
}