import { RegulationApiRepo } from "./regulation.api.repo";
import { RegulationStorageRepo } from "./regulation.storage.repo";
import type { RegulationRepo } from "./regulation.repo";

export function createRegulationRepo(): RegulationRepo {
    const source = import.meta.env.VITE_GRCPC_REGULATION_SOURCE ?? "storage";
    return source === "api" ? new RegulationApiRepo() : new RegulationStorageRepo();
}
