import { PolicyApiRepo } from "./policy.api.repo";
import { PolicyStorageRepo } from "./policy.storage.repo";
import type { PolicyRepo } from "./policy.repo";

export function createPolicyRepo(): PolicyRepo {
    const source = import.meta.env.VITE_GRCPC_POLICY_SOURCE ?? "storage";
    return source === "api" ? new PolicyApiRepo() : new PolicyStorageRepo();
}
