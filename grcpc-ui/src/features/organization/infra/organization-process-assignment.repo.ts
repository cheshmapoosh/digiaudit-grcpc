import type {
    OrganizationProcessAssignment,
    OrganizationProcessAssignmentCreate,
} from "../domain/organization-process-assignment.model";

export interface OrganizationProcessAssignmentRepo {
    listByOrganization(organizationId: string): Promise<OrganizationProcessAssignment[]>;
    create(payload: OrganizationProcessAssignmentCreate): Promise<OrganizationProcessAssignment>;
    remove(id: string): Promise<void>;
}
