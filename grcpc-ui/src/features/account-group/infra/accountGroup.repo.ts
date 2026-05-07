import type {
    AccountGroupNode,
    AccountGroupNodeCreate,
    AccountGroupNodeUpdate,
} from "../domain/accountGroup.model";

export interface AccountGroupRepo {
    list(): Promise<AccountGroupNode[]>;
    getById(id: string): Promise<AccountGroupNode | null>;
    create(payload: AccountGroupNodeCreate): Promise<AccountGroupNode>;
    update(id: string, payload: AccountGroupNodeUpdate): Promise<AccountGroupNode>;
    remove(id: string): Promise<void>;
    getChildren(parentId: string | null): Promise<AccountGroupNode[]>;
    toggleStatus(id: string): Promise<AccountGroupNode>;
}
