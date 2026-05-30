import { OrganizationReferenceAssignmentApiRepo } from "./organization-reference-assignment.api.repo";
import type { OrganizationReferenceAssignmentRepo } from "./organization-reference-assignment.repo";

export function createOrganizationReferenceAssignmentRepo(): OrganizationReferenceAssignmentRepo {
    return new OrganizationReferenceAssignmentApiRepo();
}
