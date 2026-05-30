import { httpClient } from "@/shared/infra/http.client";
import type {
    OrganizationControlView,
    OrganizationRiskAssignment,
    OrganizationRiskAssignmentCreate,
} from "../domain/organization-process-assignment.model";
import type { OrganizationProcessRelationshipRepo } from "./organization-process-relationship.repo";

const ORGANIZATIONS_URL = "/api/organizations";
const RISK_ASSIGNMENTS_URL = "/api/organization-risk-assignments";

export class OrganizationProcessRelationshipApiRepo
    implements OrganizationProcessRelationshipRepo
{
    async listControlsByOrganization(
        organizationId: string,
    ): Promise<OrganizationControlView[]> {
        return httpClient.get<OrganizationControlView[]>(
            `${ORGANIZATIONS_URL}/${organizationId}/controls`,
        );
    }

    async listRisksByOrganization(
        organizationId: string,
    ): Promise<OrganizationRiskAssignment[]> {
        return httpClient.get<OrganizationRiskAssignment[]>(
            `${ORGANIZATIONS_URL}/${organizationId}/risk-assignments`,
        );
    }

    async assignRisk(
        payload: OrganizationRiskAssignmentCreate,
    ): Promise<OrganizationRiskAssignment> {
        return httpClient.post<OrganizationRiskAssignment>(
            RISK_ASSIGNMENTS_URL,
            payload,
        );
    }

    async removeRiskAssignment(id: string): Promise<void> {
        await httpClient.delete<void>(`${RISK_ASSIGNMENTS_URL}/${id}`);
    }
}
