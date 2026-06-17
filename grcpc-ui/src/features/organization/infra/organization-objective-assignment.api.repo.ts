import { httpClient } from "@/shared/infra/http.client";
import type {
    OrganizationObjectiveAssignment,
    OrganizationObjectiveAssignmentCreate,
} from "../domain/organization-objective-assignment.model";
import type { OrganizationObjectiveAssignmentRepo } from "./organization-objective-assignment.repo";

const ORGANIZATIONS_URL = "/api/organizations";
const ASSIGNMENTS_URL = "/api/objective-organization-assignments";

export class OrganizationObjectiveAssignmentApiRepo
    implements OrganizationObjectiveAssignmentRepo
{
    async listByOrganization(
        organizationId: string,
    ): Promise<OrganizationObjectiveAssignment[]> {
        return httpClient.get<OrganizationObjectiveAssignment[]>(
            `${ORGANIZATIONS_URL}/${organizationId}/objective-assignments`,
        );
    }

    async create(
        payload: OrganizationObjectiveAssignmentCreate,
    ): Promise<OrganizationObjectiveAssignment> {
        return httpClient.post<OrganizationObjectiveAssignment>(
            ASSIGNMENTS_URL,
            payload,
        );
    }

    async remove(id: string): Promise<void> {
        await httpClient.delete<void>(`${ASSIGNMENTS_URL}/${id}`);
    }
}
