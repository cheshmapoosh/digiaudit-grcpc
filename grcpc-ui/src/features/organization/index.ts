export { organizationRoutes } from "./routes";

export type {
    MasterDataAggregateMutationResponse,
    MasterDataRevisionMutationResponse,
    OrganizationLifecycleCommand,
    OrganizationEditableStatus,
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
    OrganizationStatus,
    OrganizationType,
    OrganizationReadonlyKeys,
} from "./domain/organization.model";

export type {
    OrganizationCreateInput,
    OrganizationUpdateInput,
} from "./domain/organization.schema";

export {
    organizationLifecycleSchema,
    organizationEditableStatusSchema,
    organizationCreateSchema,
    organizationUpdateSchema,
    organizationStatusSchema,
    organizationTypeSchema,
} from "./domain/organization.schema";

export { ORGANIZATION_TYPES } from "./domain/organization.model";

export { organizationService, createOrganizationService } from "./service/organization.service";

export { useOrganizationState, ROOT_PARENT } from "./state/organization.state";
