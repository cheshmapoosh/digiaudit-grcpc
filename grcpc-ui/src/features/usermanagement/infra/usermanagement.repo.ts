import type { CreateUserInput, AssignGlobalRoleInput } from "../domain/usermanagement.model";
import type {
    RoleDetail,
    RoleSummary,
    UserDetail,
    UserSummary,
} from "@/features/usermanagement";

export interface UserManagementRepo {
    resetPassword(userId: string, password: string): Promise<void>;
    enableUser(userId: string, password: string): Promise<void>;
    disableUser(userId: string): Promise<void>;
    createUser(input: CreateUserInput): Promise<string>;
    assignRole(userId: string, input: AssignGlobalRoleInput): Promise<void>;
    listUsers(): Promise<UserSummary[]>;
    getUserById(id: string): Promise<UserDetail | null>;
    listRoles(): Promise<RoleSummary[]>;
    getRoleById(id: string): Promise<RoleDetail | null>;
}
