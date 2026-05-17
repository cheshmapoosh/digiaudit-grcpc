import { RiskApiRepo } from "./risk.api.repo";
import { RiskStorageRepo } from "./risk.storage.repo";
import type { RiskRepo } from "./risk.repo";
import { resolveRepoSource } from "@/shared/infra/repoSource";

export function createRiskRepo(): RiskRepo {
    const source = resolveRepoSource(
        import.meta.env.VITE_GRCPC_RISK_SOURCE,
        "storage",
    );

    return source === "api" ? new RiskApiRepo() : new RiskStorageRepo();
}
