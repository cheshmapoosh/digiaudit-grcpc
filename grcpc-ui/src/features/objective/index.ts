export { objectiveRoutes } from "./routes";

export type {
    ObjectiveNode,
    ObjectiveNodeCreate,
    ObjectiveNodeType,
    ObjectiveNodeUpdate,
    ObjectiveReadonlyKeys,
    ObjectiveStatus,
    ObjectiveType,
} from "./domain/objective.model";

export type {
    ObjectiveCreateInput,
    ObjectiveUpdateInput,
} from "./domain/objective.schema";

export {
    objectiveCreateSchema,
    objectiveNodeTypeSchema,
    objectiveStatusSchema,
    objectiveTypeSchema,
    objectiveUpdateSchema,
} from "./domain/objective.schema";

export { createObjectiveService, objectiveService } from "./service/objective.service";

export { ROOT_PARENT, useObjectiveState } from "./state/objective.state";
