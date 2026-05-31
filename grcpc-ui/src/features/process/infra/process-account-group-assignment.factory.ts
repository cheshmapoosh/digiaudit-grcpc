import { ProcessAccountGroupAssignmentApiRepo } from "./process-account-group-assignment.api.repo";
import type { ProcessAccountGroupAssignmentRepo } from "./process-account-group-assignment.repo";

export function createProcessAccountGroupAssignmentRepo(): ProcessAccountGroupAssignmentRepo {
    return new ProcessAccountGroupAssignmentApiRepo();
}
