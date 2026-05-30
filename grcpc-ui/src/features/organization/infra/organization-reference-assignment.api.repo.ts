import { httpClient } from "@/shared/infra/http.client";
import type {
    OrganizationReferenceAssignment,
    OrganizationReferenceAssignmentCreate,
    OrganizationReferenceType,
} from "../domain/organization-process-assignment.model";
import type { OrganizationReferenceAssignmentRepo } from "./organization-reference-assignment.repo";

const ORGANIZATIONS_URL = "/api/organizations";
const ASSIGNMENTS_URL = "/api/organization-reference-assignments";

export class OrganizationReferenceAssignmentApiRepo
    implements OrganizationReferenceAssignmentRepo
{
    async listByOrganization(
        organizationId: string,
        referenceType: OrganizationReferenceType,
    ): Promise<OrganizationReferenceAssignment[]> {
        const query = new URLSearchParams({ referenceType }).toString();

        return httpClient.get<OrganizationReferenceAssignment[]>(
            `${ORGANIZATIONS_URL}/${organizationId}/reference-assignments?${query}`,
        );
    }

    async create(
        payload: OrganizationReferenceAssignmentCreate,
    ): Promise<OrganizationReferenceAssignment> {
        return httpClient.post<OrganizationReferenceAssignment>(
            ASSIGNMENTS_URL,
            payload,
        );
    }

    async remove(id: string): Promise<void> {
        await httpClient.delete<void>(`${ASSIGNMENTS_URL}/${id}`);
    }
}
