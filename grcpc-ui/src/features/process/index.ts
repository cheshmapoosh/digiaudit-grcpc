export { processRoutes } from "./routes";

export type {
    CentralProcessResponse,
    CentralSubprocessResponse,
    MasterDataAggregateMutationResponse,
    MasterDataRevisionMutationResponse,
    ProcessLifecycleCommand,
    ProcessEditableStatus,
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeType,
    ProcessNodeUpdate,
    ProcessReadonlyKeys,
    ProcessStatus,
} from "./domain/process.model";

export type {
    ProcessCreateInput,
    ProcessUpdateInput,
} from "./domain/process.schema";

export {
    processCreateSchema,
    processEditableStatusSchema,
    processLifecycleSchema,
    processNodeTypeSchema,
    processStatusSchema,
    processUpdateSchema,
} from "./domain/process.schema";

export { createProcessService, processService } from "./service/process.service";

export { ROOT_PARENT, useProcessState } from "./state/process.state";
