import { AccountGroupApiRepo } from "./accountGroup.api.repo";
import { AccountGroupStorageRepo } from "./accountGroup.storage.repo";
import type { AccountGroupRepo } from "./accountGroup.repo";
import { resolveRepoSource } from "@/shared/infra/repoSource";

export function createAccountGroupRepo(): AccountGroupRepo {
    const source = resolveRepoSource(
        import.meta.env.VITE_GRCPC_ACCOUNT_GROUP_SOURCE,
        "storage",
    );

    return source === "api" ? new AccountGroupApiRepo() : new AccountGroupStorageRepo();
}
