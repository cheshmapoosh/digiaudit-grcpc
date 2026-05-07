import { RiskApiRepo } from "./risk.api.repo";
import { RiskStorageRepo } from "./risk.storage.repo";
import type { RiskRepo } from "./risk.repo";

export function createRiskRepo(): RiskRepo {
    const source = import.meta.env.VITE_GRCPC_RISK_SOURCE ?? "storage";
    return source === "api" ? new RiskApiRepo() : new RiskStorageRepo();
}
