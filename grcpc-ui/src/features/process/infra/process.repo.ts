import type {
    MasterDataRevisionMutationResponse,
    ProcessLifecycleCommand,
    ProcessMoveCommand,
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeUpdate,
    ProcessNodeType,
} from "../domain/process.model";

export interface ProcessRepo {
    list(): Promise<ProcessNode[]>;
    getById(id: string, nodeType?: ProcessNodeType): Promise<ProcessNode | null>;
    create(payload: ProcessNodeCreate): Promise<MasterDataRevisionMutationResponse>;
    update(
        node: ProcessNode,
        payload: ProcessNodeUpdate,
    ): Promise<MasterDataRevisionMutationResponse>;
    move(
        node: ProcessNode,
        payload: ProcessMoveCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
    delete(
        node: ProcessNode,
        payload: ProcessLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
}
