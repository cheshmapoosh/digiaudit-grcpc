import { OrganizationApiRepo } from "./organization.api.repo";
import { OrganizationStorageRepo } from "./organization.storage.repo";
import type { OrganizationRepo } from "./organization.repo";
import { resolveRepoSource } from "@/shared/infra/repoSource";

export function createOrganizationRepo(): OrganizationRepo {
    const source = resolveRepoSource(
        import.meta.env.VITE_GRCPC_ORGANIZATION_SOURCE,
        "storage",
    );

    return source === "api" ? new OrganizationApiRepo() : new OrganizationStorageRepo();
}
