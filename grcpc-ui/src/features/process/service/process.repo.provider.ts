import type { ProcessRepo } from "./process.repo";
import { processStorageRepo } from "./process.storage.repo";
import { processApiRepo } from "./process.api.repo";

const SOURCE = import.meta.env.VITE_GRC_PROCESS_SOURCE ?? "storage";
// storage | api
export const processRepo: ProcessRepo = SOURCE === "api" ? processApiRepo : processStorageRepo;