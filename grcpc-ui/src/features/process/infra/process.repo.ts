import type {
    MasterDataAggregateMutationResponse,
    MasterDataRevisionMutationResponse,
    ProcessLifecycleCommand,
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeUpdate,
    ProcessNodeType,
} from "../domain/process.model";

export interface ProcessRepo {
    list(): Promise<ProcessNode[]>;
    getById(id: string, nodeType?: ProcessNodeType): Promise<ProcessNode | null>;
    create(payload: ProcessNodeCreate): Promise<MasterDataAggregateMutationResponse>;
    update(
        node: ProcessNode,
        payload: ProcessNodeUpdate,
    ): Promise<MasterDataAggregateMutationResponse>;
    delete(
        node: ProcessNode,
        payload: ProcessLifecycleCommand,
    ): Promise<MasterDataRevisionMutationResponse>;
}
