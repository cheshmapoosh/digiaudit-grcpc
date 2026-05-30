import { OrganizationProcessAssignmentApiRepo } from "./organization-process-assignment.api.repo";
import type { OrganizationProcessAssignmentRepo } from "./organization-process-assignment.repo";

export function createOrganizationProcessAssignmentRepo(): OrganizationProcessAssignmentRepo {
    return new OrganizationProcessAssignmentApiRepo();
}
