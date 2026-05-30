import { resolveRepoSource } from "@/shared/infra/repoSource";
import { OrganizationProcessAssignmentApiRepo } from "./organization-process-assignment.api.repo";
import type { OrganizationProcessAssignmentRepo } from "./organization-process-assignment.repo";
import { OrganizationProcessAssignmentStorageRepo } from "./organization-process-assignment.storage.repo";

export function createOrganizationProcessAssignmentRepo(): OrganizationProcessAssignmentRepo {
    const source = resolveRepoSource(
        import.meta.env.VITE_GRCPC_ORGANIZATION_PROCESS_ASSIGNMENT_SOURCE ??
            import.meta.env.VITE_GRCPC_ORGANIZATION_SOURCE,
        "storage",
    );

    return source === "api"
        ? new OrganizationProcessAssignmentApiRepo()
        : new OrganizationProcessAssignmentStorageRepo();
}
