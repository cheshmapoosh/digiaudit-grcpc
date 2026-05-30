import type {
    OrganizationControlView,
    OrganizationRiskAssignment,
    OrganizationRiskAssignmentCreate,
} from "../domain/organization-process-assignment.model";
import type { OrganizationProcessRelationshipRepo } from "./organization-process-relationship.repo";

export class OrganizationProcessRelationshipStorageRepo
    implements OrganizationProcessRelationshipRepo
{
    async listControlsByOrganization(): Promise<OrganizationControlView[]> {
        return [];
    }

    async listRisksByOrganization(): Promise<OrganizationRiskAssignment[]> {
        return [];
    }

    async assignRisk(
        payload: OrganizationRiskAssignmentCreate,
    ): Promise<OrganizationRiskAssignment> {
        return {
            id: `local-risk-assignment-${Date.now()}`,
            organizationId: payload.organizationId,
            processNodeId: payload.processNodeId,
            subProcessCode: "",
            subProcessTitle: "",
            riskNodeId: payload.riskNodeId,
            riskCode: "",
            riskTitle: "",
            status: "active",
            assignmentType: payload.assignmentType ?? "scope",
            validFrom: payload.validFrom,
            validTo: payload.validTo,
            isActive: payload.isActive ?? true,
        };
    }

    async removeRiskAssignment(): Promise<void> {
        return undefined;
    }
}
