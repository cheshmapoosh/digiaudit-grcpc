import { RiskApiRepo } from "./risk.api.repo";
import type { RiskRepo } from "./risk.repo";

export function createRiskRepo(): RiskRepo {
    return new RiskApiRepo();
}
