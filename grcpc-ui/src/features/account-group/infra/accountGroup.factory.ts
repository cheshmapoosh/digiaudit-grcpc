import { AccountGroupApiRepo } from "./accountGroup.api.repo";
import { AccountGroupStorageRepo } from "./accountGroup.storage.repo";
import type { AccountGroupRepo } from "./accountGroup.repo";

export function createAccountGroupRepo(): AccountGroupRepo {
    const source = import.meta.env.VITE_GRCPC_ACCOUNT_GROUP_SOURCE ?? "storage";
    return source === "api" ? new AccountGroupApiRepo() : new AccountGroupStorageRepo();
}
