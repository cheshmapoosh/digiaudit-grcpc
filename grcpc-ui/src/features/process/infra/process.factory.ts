import { ProcessApiRepo } from "./process.api.repo";
import { ProcessStorageRepo } from "./process.storage.repo";
import type { ProcessRepo } from "./process.repo";

export function createProcessRepo(): ProcessRepo {
    const SOURCE = import.meta.env.VITE_GRCPC_PROCESS_SOURCE ?? "storage";
    return SOURCE === "api" ? new ProcessApiRepo() : new ProcessStorageRepo();
}
