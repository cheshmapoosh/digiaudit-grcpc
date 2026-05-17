import { PolicyApiRepo } from "./policy.api.repo";
import { PolicyStorageRepo } from "./policy.storage.repo";
import type { PolicyRepo } from "./policy.repo";
import { resolveRepoSource } from "@/shared/infra/repoSource";

export function createPolicyRepo(): PolicyRepo {
    const source = resolveRepoSource(
        import.meta.env.VITE_GRCPC_POLICY_SOURCE,
        "storage",
    );

    return source === "api" ? new PolicyApiRepo() : new PolicyStorageRepo();
}
