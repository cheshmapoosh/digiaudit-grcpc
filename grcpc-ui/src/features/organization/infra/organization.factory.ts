import { OrganizationApiRepo } from "./organization.api.repo";
import { OrganizationStorageRepo } from "./organization.storage.repo";
import type { OrganizationRepo } from "./organization.repo";

export function createOrganizationRepo(): OrganizationRepo {
    const SOURCE = import.meta.env.REPO_IMPLEMENTATION ?? "storage";
    return SOURCE === "api" ? new OrganizationApiRepo() : new OrganizationStorageRepo();
}