import { ProcessApiRepo } from "./process.api.repo";
import { ProcessStorageRepo } from "./process.storage.repo";
import type { ProcessRepo } from "./process.repo";
import { resolveRepoSource } from "@/shared/infra/repoSource";

export function createProcessRepo(): ProcessRepo {
    const source = resolveRepoSource(
        import.meta.env.VITE_GRCPC_PROCESS_SOURCE,
        "storage",
    );

    return source === "api" ? new ProcessApiRepo() : new ProcessStorageRepo();
}
