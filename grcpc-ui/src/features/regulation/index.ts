export { regulationRoutes } from "./routes";

export type {
    RegulationNode,
    RegulationNodeCreate,
    RegulationNodeUpdate,
    RegulationStatus,
    RegulationType,
    RegulationReadonlyKeys,
} from "./domain/regulation.model";

export type {
    RegulationCreateInput,
    RegulationUpdateInput,
} from "./domain/regulation.schema";

export {
    regulationCreateSchema,
    regulationUpdateSchema,
    regulationStatusSchema,
    regulationTypeSchema,
} from "./domain/regulation.schema";

export { regulationService, createRegulationService } from "./service/regulation.service";

export { useRegulationStore, ROOT_PARENT } from "./state/regulation.state.ts";