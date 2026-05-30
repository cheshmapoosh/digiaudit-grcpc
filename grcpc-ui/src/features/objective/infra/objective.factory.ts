import { ObjectiveApiRepo } from "./objective.api.repo";
import type { ObjectiveRepo } from "./objective.repo";

export function createObjectiveRepo(): ObjectiveRepo {
    return new ObjectiveApiRepo();
}
