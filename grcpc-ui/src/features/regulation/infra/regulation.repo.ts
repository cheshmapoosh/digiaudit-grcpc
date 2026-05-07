import type {
    RegulationNode,
    RegulationNodeCreate,
    RegulationNodeUpdate,
} from "../domain/regulation.model";

export interface RegulationRepo {
    list(): Promise<RegulationNode[]>;
    getById(id: string): Promise<RegulationNode | null>;
    create(payload: RegulationNodeCreate): Promise<RegulationNode>;
    update(id: string, payload: RegulationNodeUpdate): Promise<RegulationNode>;
    remove(id: string): Promise<void>;
    getChildren(parentId: string | null): Promise<RegulationNode[]>;
    toggleStatus(id: string): Promise<RegulationNode>;
}
