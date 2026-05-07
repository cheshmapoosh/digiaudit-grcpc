import type {
    ObjectiveNode,
    ObjectiveNodeCreate,
    ObjectiveNodeUpdate,
} from "../domain/objective.model";

export interface ObjectiveRepo {
    list(): Promise<ObjectiveNode[]>;
    getById(id: string): Promise<ObjectiveNode | null>;
    create(payload: ObjectiveNodeCreate): Promise<ObjectiveNode>;
    update(id: string, payload: ObjectiveNodeUpdate): Promise<ObjectiveNode>;
    remove(id: string): Promise<void>;
    getChildren(parentId: string | null): Promise<ObjectiveNode[]>;
    toggleStatus(id: string): Promise<ObjectiveNode>;
}
