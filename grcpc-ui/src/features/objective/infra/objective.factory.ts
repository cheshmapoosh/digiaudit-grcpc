import { ObjectiveApiRepo } from "./objective.api.repo";
import { ObjectiveStorageRepo } from "./objective.storage.repo";
import type { ObjectiveRepo } from "./objective.repo";

export function createObjectiveRepo(): ObjectiveRepo {
    const source = import.meta.env.VITE_GRCPC_OBJECTIVE_SOURCE ?? "storage";
    return source === "api" ? new ObjectiveApiRepo() : new ObjectiveStorageRepo();
}
