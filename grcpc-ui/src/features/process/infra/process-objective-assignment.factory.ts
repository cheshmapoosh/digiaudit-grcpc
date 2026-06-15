import { ProcessObjectiveAssignmentApiRepo } from "./process-objective-assignment.api.repo";
import type { ProcessObjectiveAssignmentRepo } from "./process-objective-assignment.repo";

export function createProcessObjectiveAssignmentRepo(): ProcessObjectiveAssignmentRepo {
    return new ProcessObjectiveAssignmentApiRepo();
}
