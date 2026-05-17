import { RegulationApiRepo } from "./regulation.api.repo";
import { RegulationStorageRepo } from "./regulation.storage.repo";
import type { RegulationRepo } from "./regulation.repo";
import { resolveRepoSource } from "@/shared/infra/repoSource";

export function createRegulationRepo(): RegulationRepo {
    const source = resolveRepoSource(
        import.meta.env.VITE_GRCPC_REGULATION_SOURCE,
        "storage",
    );

    return source === "api" ? new RegulationApiRepo() : new RegulationStorageRepo();
}
