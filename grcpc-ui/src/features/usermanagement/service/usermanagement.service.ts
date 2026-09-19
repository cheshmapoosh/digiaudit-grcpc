import type { CreateUserInput, AssignGlobalRoleInput } from "../domain/usermanagement.model";
import type { UserManagementRepo } from "../infra/usermanagement.repo";
import { createUserManagementRepo } from "../infra/usermanagement.factory";
import type {
    RoleDetail,
    RoleSummary,
    UserDetail,
    UserSummary,
} from "@/features/usermanagement";

export interface UserManagementService {
    resetPassword(userId: string, password: string): Promise<void>;
    enableUser(userId: string, password: string): Promise<void>;
    disableUser(userId: string): Promise<void>;
    createUser(input: CreateUserInput): Promise<string>;
    assignRole(userId: string, input: AssignGlobalRoleInput): Promise<void>;
    listUsers(): Promise<UserSummary[]>;
    getUserById(id: string): Promise<UserDetail>;
    listRoles(): Promise<RoleSummary[]>;
    getRoleById(id: string): Promise<RoleDetail>;
}

function sortUsers(items: UserSummary[]): UserSummary[] {
    return [...items].sort((left, right) => left.username.localeCompare(right.username));
}

function sortRoles(items: RoleSummary[]): RoleSummary[] {
    return [...items].sort((left, right) => (left.title ?? "").localeCompare(right.title ?? "", "fa"));
}

export function createUserManagementService(repo: UserManagementRepo): UserManagementService {
    return {
        resetPassword: (userId, password) => repo.resetPassword(userId, password),
        enableUser: (userId, password) => repo.enableUser(userId, password),
        disableUser: (userId) => repo.disableUser(userId),
        createUser: (input) => repo.createUser(input),
        assignRole: (userId, input) => repo.assignRole(userId, input),
        async listUsers() {
            const items = await repo.listUsers();
            return sortUsers(items);
        },

        async getUserById(id) {
            const user = await repo.getUserById(id);

            if (!user) {
                throw new Error("اطلاعات کاربر دریافت نشد");
            }

            return user;
        },

        async listRoles() {
            const items = await repo.listRoles();
            return sortRoles(items);
        },

        async getRoleById(id) {
            const role = await repo.getRoleById(id);

            if (!role) {
                throw new Error("اطلاعات نقش دریافت نشد");
            }

            return role;
        },
    };
}

const userManagementRepo = createUserManagementRepo();
export const userManagementService = createUserManagementService(userManagementRepo);