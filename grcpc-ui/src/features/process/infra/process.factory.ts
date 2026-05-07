import { ProcessApiRepo } from "./process.api.repo";
import { ProcessStorageRepo } from "./process.storage.repo";
import type { ProcessRepo } from "./process.repo";

export function createProcessRepo(): ProcessRepo {
    const source = import.meta.env.VITE_GRCPC_PROCESS_SOURCE ?? "storage";
    return source === "api" ? new ProcessApiRepo() : new ProcessStorageRepo();
}
