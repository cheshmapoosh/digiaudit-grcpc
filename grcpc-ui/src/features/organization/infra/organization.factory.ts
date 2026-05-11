import { OrganizationApiRepo } from "./organization.api.repo";
import { OrganizationStorageRepo } from "./organization.storage.repo";
import type { OrganizationRepo } from "./organization.repo";

export function createOrganizationRepo(): OrganizationRepo {
    const source =
        import.meta.env.VITE_GRCPC_ORGANIZATION_SOURCE ??
        import.meta.env.VITE_GRCPC_PROCESS_SOURCE ??
        "storage";

    return source === "api" ? new OrganizationApiRepo() : new OrganizationStorageRepo();
}
