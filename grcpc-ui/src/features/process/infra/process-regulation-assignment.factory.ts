import { ProcessRegulationAssignmentApiRepo } from "./process-regulation-assignment.api.repo";
import type { ProcessRegulationAssignmentRepo } from "./process-regulation-assignment.repo";

export function createProcessRegulationAssignmentRepo(): ProcessRegulationAssignmentRepo {
    return new ProcessRegulationAssignmentApiRepo();
}
