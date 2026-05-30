import { resolveRepoSource } from "@/shared/infra/repoSource";
import { OrganizationProcessRelationshipApiRepo } from "./organization-process-relationship.api.repo";
import type { OrganizationProcessRelationshipRepo } from "./organization-process-relationship.repo";
import { OrganizationProcessRelationshipStorageRepo } from "./organization-process-relationship.storage.repo";

export function createOrganizationProcessRelationshipRepo(): OrganizationProcessRelationshipRepo {
    const source = resolveRepoSource(
        import.meta.env.VITE_GRCPC_ORGANIZATION_PROCESS_RELATIONSHIP_SOURCE ??
            import.meta.env.VITE_GRCPC_ORGANIZATION_PROCESS_ASSIGNMENT_SOURCE ??
            import.meta.env.VITE_GRCPC_ORGANIZATION_SOURCE,
        "storage",
    );

    return source === "api"
        ? new OrganizationProcessRelationshipApiRepo()
        : new OrganizationProcessRelationshipStorageRepo();
}
