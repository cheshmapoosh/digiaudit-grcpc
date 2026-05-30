import { OrganizationProcessRelationshipApiRepo } from "./organization-process-relationship.api.repo";
import type { OrganizationProcessRelationshipRepo } from "./organization-process-relationship.repo";

export function createOrganizationProcessRelationshipRepo(): OrganizationProcessRelationshipRepo {
    return new OrganizationProcessRelationshipApiRepo();
}
