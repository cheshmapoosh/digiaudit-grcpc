export { processRoutes } from "./routes";

export type {
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeUpdate,
    ProcessStatus,
    ProcessReadonlyKeys,
} from "./domain/process.model";

export type {
    ProcessCreateInput,
    ProcessUpdateInput,
} from "./domain/process.schema";

export {
    processCreateSchema,
    processUpdateSchema,
    processStatusSchema,
} from "./domain/process.schema";

export { processService, createProcessService } from "./service/process.service";

export { useProcessStore, ROOT_PARENT } from "./state/process.state.ts";