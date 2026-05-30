import type {
    OrganizationControlView,
    OrganizationRiskAssignment,
    OrganizationRiskAssignmentCreate,
} from "../domain/organization-process-assignment.model";

export interface OrganizationProcessRelationshipRepo {
    listControlsByOrganization(organizationId: string): Promise<OrganizationControlView[]>;
    listRisksByOrganization(organizationId: string): Promise<OrganizationRiskAssignment[]>;
    assignRisk(payload: OrganizationRiskAssignmentCreate): Promise<OrganizationRiskAssignment>;
    removeRiskAssignment(id: string): Promise<void>;
}
