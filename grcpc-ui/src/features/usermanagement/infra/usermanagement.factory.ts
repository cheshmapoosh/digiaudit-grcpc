import type { UserManagementRepo } from "./usermanagement.repo";
import { UserManagementApiRepo } from "./usermanagement.api.repo";
import { UserManagementStorageRepo } from "./usermanagement.storage.repo";
import { resolveRepoSource } from "@/shared/infra/repoSource";

function resolveSource(): "api" | "storage" {
    return resolveRepoSource(import.meta.env.VITE_GRCPC_USERMANAGEMENT_SOURCE, "api");
}

export function createUserManagementRepo(): UserManagementRepo {
    return resolveSource() === "storage"
        ? new UserManagementStorageRepo()
        : new UserManagementApiRepo();
}
