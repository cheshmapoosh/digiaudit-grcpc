export { processRoutes } from "./routes";

export type {
    ProcessCategory,
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeType,
    ProcessNodeUpdate,
    ProcessReadonlyKeys,
    ProcessStatus,
} from "./domain/process.model";

export type {
    ProcessObjectiveAssignment,
    ProcessObjectiveAssignmentCreate,
    ProcessObjectiveAssignmentStatus,
    ProcessObjectiveAssignmentType,
} from "./domain/process-objective-assignment.model";

export type {
    ProcessAccountGroupAssignment,
    ProcessAccountGroupAssignmentCreate,
    ProcessAccountGroupAssignmentStatus,
    ProcessAccountGroupAssignmentType,
} from "./domain/process-account-group-assignment.model";

export type {
    ProcessCreateInput,
    ProcessUpdateInput,
} from "./domain/process.schema";

export {
    processCategorySchema,
    processCreateSchema,
    processNodeTypeSchema,
    processStatusSchema,
    processUpdateSchema,
} from "./domain/process.schema";

export { createProcessService, processService } from "./service/process.service";

export {
    createProcessObjectiveAssignmentService,
    processObjectiveAssignmentService,
} from "./service/process-objective-assignment.service";

export {
    createProcessAccountGroupAssignmentService,
    processAccountGroupAssignmentService,
} from "./service/process-account-group-assignment.service";

export { ROOT_PARENT, useProcessState } from "./state/process.state";
