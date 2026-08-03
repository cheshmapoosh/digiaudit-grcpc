export { processRoutes } from "./routes";

export type {
    CentralProcessResponse,
    CentralSubprocessResponse,
    MasterDataRevisionMutationResponse,
    ProcessLifecycleCommand,
    ProcessMoveCommand,
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeType,
    ProcessNodeUpdate,
    ProcessReadonlyKeys,
    ProcessStatus,
} from "./domain/process.model";

export type {
    ProcessCreateInput,
    ProcessMoveInput,
    ProcessUpdateInput,
} from "./domain/process.schema";

export {
    processCreateSchema,
    processLifecycleSchema,
    processMoveSchema,
    processNodeTypeSchema,
    processStatusSchema,
    processUpdateSchema,
} from "./domain/process.schema";

export { createProcessService, processService } from "./service/process.service";

export { ROOT_PARENT, useProcessState } from "./state/process.state";
