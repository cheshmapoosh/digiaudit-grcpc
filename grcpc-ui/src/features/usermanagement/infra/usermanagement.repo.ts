import type {
    RoleDetail,
    RoleSummary,
    UserDetail,
    UserSummary,
} from "@/features/usermanagement";

export interface UserManagementRepo {
    listUsers(): Promise<UserSummary[]>;
    getUserById(id: string): Promise<UserDetail | null>;
    listRoles(): Promise<RoleSummary[]>;
    getRoleById(id: string): Promise<RoleDetail | null>;
}
