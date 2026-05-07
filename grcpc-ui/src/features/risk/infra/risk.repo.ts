import type {
    RiskNode,
    RiskNodeCreate,
    RiskNodeUpdate,
} from "../domain/risk.model";

export interface RiskRepo {
    list(): Promise<RiskNode[]>;
    getById(id: string): Promise<RiskNode | null>;
    create(payload: RiskNodeCreate): Promise<RiskNode>;
    update(id: string, payload: RiskNodeUpdate): Promise<RiskNode>;
    remove(id: string): Promise<void>;
    getChildren(parentId: string | null): Promise<RiskNode[]>;
    toggleStatus(id: string): Promise<RiskNode>;
}
