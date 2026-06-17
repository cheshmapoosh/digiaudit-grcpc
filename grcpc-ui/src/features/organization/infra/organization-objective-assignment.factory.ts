import { OrganizationObjectiveAssignmentApiRepo } from "./organization-objective-assignment.api.repo";
import type { OrganizationObjectiveAssignmentRepo } from "./organization-objective-assignment.repo";

let repo: OrganizationObjectiveAssignmentRepo | null = null;

export function createOrganizationObjectiveAssignmentRepo(): OrganizationObjectiveAssignmentRepo {
    if (!repo) {
        repo = new OrganizationObjectiveAssignmentApiRepo();
    }

    return repo;
}
