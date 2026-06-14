import { ProcessRiskAssignmentApiRepo } from "./process-risk-assignment.api.repo";
import type { ProcessRiskAssignmentRepo } from "./process-risk-assignment.repo";

export function createProcessRiskAssignmentRepo(): ProcessRiskAssignmentRepo {
    return new ProcessRiskAssignmentApiRepo();
}
