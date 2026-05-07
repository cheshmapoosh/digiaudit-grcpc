import type {
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeUpdate,
} from "../domain/process.model";

export interface ProcessRepo {
    list(): Promise<ProcessNode[]>;
    getById(id: string): Promise<ProcessNode | null>;
    create(payload: ProcessNodeCreate): Promise<ProcessNode>;
    update(id: string, payload: ProcessNodeUpdate): Promise<ProcessNode>;
    remove(id: string): Promise<void>;
    getChildren(parentId: string | null): Promise<ProcessNode[]>;
    toggleStatus(id: string): Promise<ProcessNode>;
}
