import type {
    PolicyNode,
    PolicyNodeCreate,
    PolicyNodeUpdate,
} from "../domain/policy.model";

export interface PolicyRepo {
    list(): Promise<PolicyNode[]>;
    getById(id: string): Promise<PolicyNode | null>;
    create(payload: PolicyNodeCreate): Promise<PolicyNode>;
    update(id: string, payload: PolicyNodeUpdate): Promise<PolicyNode>;
    remove(id: string): Promise<void>;
    getChildren(parentId: string | null): Promise<PolicyNode[]>;
    toggleStatus(id: string): Promise<PolicyNode>;
}
