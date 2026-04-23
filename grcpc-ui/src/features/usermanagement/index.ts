export { usermanagementRoutes } from "./routes";

export type {
    LocalizedText,
    PermissionItem,
    RoleDetail,
    RoleSummary,
    UserSummary,
    UserDetail,
    UserRoleAssignment,
} from "./domain/usermanagement.model";

export {
    localizedTextSchema,
    permissionItemSchema,
    roleSummarySchema,
    roleSummaryListSchema,
    roleDetailSchema,
    userSummarySchema,
    userSummaryListSchema,
    userDetailSchema,
    userRoleAssignmentSchema,
} from "./domain/usermanagement.schema";

export { userManagementService, createUserManagementService } from "./service/usermanagement.service";
export { useUserManagementState } from "./state/usermanagement.state";
