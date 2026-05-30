import { OrganizationApiRepo } from "./organization.api.repo";
import type { OrganizationRepo } from "./organization.repo";

export function createOrganizationRepo(): OrganizationRepo {
    return new OrganizationApiRepo();
}
