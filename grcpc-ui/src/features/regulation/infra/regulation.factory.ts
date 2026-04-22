import { RegulationApiRepo } from "./regulation.api.repo";
import { RegulationStorageRepo } from "./regulation.storage.repo";
import type { RegulationRepo } from "./regulation.repo";

export function createRegulationRepo(): RegulationRepo {
    const SOURCE = import.meta.env.VITE_GRCPC_PROCESS_SOURCE ?? "storage";
    return SOURCE === "api" ? new RegulationApiRepo() : new RegulationStorageRepo();
}