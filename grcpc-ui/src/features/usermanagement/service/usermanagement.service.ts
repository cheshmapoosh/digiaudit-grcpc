import type { UserManagementRepo } from "../infra/usermanagement.repo";
import { createUserManagementRepo } from "../infra/usermanagement.factory";
import type {
    RoleDetail,
    RoleSummary,
    UserDetail,
    UserSummary,
} from "@/features/usermanagement";

export interface UserManagementService {
    listUsers(): Promise<UserSummary[]>;
    getUserById(id: string): Promise<UserDetail | null>;
    listRoles(): Promise<RoleSummary[]>;
    getRoleById(id: string): Promise<RoleDetail | null>;
}

export function createUserManagementService(repo: UserManagementRepo): UserManagementService {
    return {
        async listUsers() {
            const items = await repo.listUsers();
            return [...items].sort((left, right) => left.username.localeCompare(right.username));
        },
        async getUserById(id) {
            return repo.getUserById(id);
        },
        async listRoles() {
            const items = await repo.listRoles();
            return [...items].sort((left, right) => left.code.localeCompare(right.code));
        },
        async getRoleById(id) {
            return repo.getRoleById(id);
        },
    };
}

const userManagementRepo = createUserManagementRepo();
export const userManagementService = createUserManagementService(userManagementRepo);
