import type { UserManagementRepo } from "./usermanagement.repo";
import { UserManagementApiRepo } from "./usermanagement.api.repo";
import { UserManagementStorageRepo } from "./usermanagement.storage.repo";

function resolveSource(): "api" | "storage" {
    const raw = String(import.meta.env.VITE_GRCPC_USERMANAGEMENT_SOURCE ?? "api").toLowerCase();
    return raw === "storage" ? "storage" : "api";
}

export function createUserManagementRepo(): UserManagementRepo {
    return resolveSource() === "storage"
        ? new UserManagementStorageRepo()
        : new UserManagementApiRepo();
}
