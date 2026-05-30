import type { UserManagementRepo } from "./usermanagement.repo";
import { UserManagementApiRepo } from "./usermanagement.api.repo";

export function createUserManagementRepo(): UserManagementRepo {
    return new UserManagementApiRepo();
}
