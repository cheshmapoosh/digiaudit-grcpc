export { regulationRoutes } from "./routes";

export type {
    RegulationNode,
    RegulationNodeCreate,
    RegulationNodeType,
    RegulationNodeUpdate,
    RegulationReadonlyKeys,
    RegulationStatus,
} from "./domain/regulation.model";

export type {
    RegulationCreateInput,
    RegulationUpdateInput,
} from "./domain/regulation.schema";

export {
    regulationCreateSchema,
    regulationNodeTypeSchema,
    regulationStatusSchema,
    regulationUpdateSchema,
} from "./domain/regulation.schema";

export { createRegulationService, regulationService } from "./service/regulation.service";

export { ROOT_PARENT, useRegulationState } from "./state/regulation.state";
