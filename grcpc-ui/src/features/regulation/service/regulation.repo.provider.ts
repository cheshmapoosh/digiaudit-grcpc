import type { RegulationRepo } from "./regulation.repo";
import { regulationStorageRepo } from "./regulation.storage.repo";
import { regulationApiRepo } from "./regulation.api.repo";

const SOURCE = import.meta.env.VITE_GRC_REGULATION_SOURCE ?? "storage";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
// storage | api
export const regulationRepo: RegulationRepo = SOURCE === "api" ? regulationApiRepo : regulationStorageRepo;