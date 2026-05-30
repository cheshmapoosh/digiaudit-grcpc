import { RegulationApiRepo } from "./regulation.api.repo";
import type { RegulationRepo } from "./regulation.repo";

export function createRegulationRepo(): RegulationRepo {
    return new RegulationApiRepo();
}
