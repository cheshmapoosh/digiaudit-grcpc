import { ObjectiveApiRepo } from "./objective.api.repo";
import { ObjectiveStorageRepo } from "./objective.storage.repo";
import type { ObjectiveRepo } from "./objective.repo";
import { resolveRepoSource } from "@/shared/infra/repoSource";

export function createObjectiveRepo(): ObjectiveRepo {
    const source = resolveRepoSource(
        import.meta.env.VITE_GRCPC_OBJECTIVE_SOURCE,
        "storage",
    );

    return source === "api" ? new ObjectiveApiRepo() : new ObjectiveStorageRepo();
}
