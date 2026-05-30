import { httpClient } from "@/shared/infra/http.client";
import type {
    OrganizationProcessAssignment,
    OrganizationProcessAssignmentCreate,
} from "../domain/organization-process-assignment.model";
import type { OrganizationProcessAssignmentRepo } from "./organization-process-assignment.repo";

const ORGANIZATIONS_URL = "/api/organizations";
const ASSIGNMENTS_URL = "/api/organization-process-assignments";

export class OrganizationProcessAssignmentApiRepo
    implements OrganizationProcessAssignmentRepo
{
    async listByOrganization(
        organizationId: string,
    ): Promise<OrganizationProcessAssignment[]> {
        return httpClient.get<OrganizationProcessAssignment[]>(
            `${ORGANIZATIONS_URL}/${organizationId}/process-assignments`,
        );
    }

    async create(
        payload: OrganizationProcessAssignmentCreate,
    ): Promise<OrganizationProcessAssignment> {
        return httpClient.post<OrganizationProcessAssignment>(
            ASSIGNMENTS_URL,
            payload,
        );
    }

    async remove(id: string): Promise<void> {
        await httpClient.delete<void>(`${ASSIGNMENTS_URL}/${id}`);
    }
}
