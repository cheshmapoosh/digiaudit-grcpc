import type {
    OrganizationObjectiveAssignment,
    OrganizationObjectiveAssignmentCreate,
} from "../domain/organization-objective-assignment.model";

export interface OrganizationObjectiveAssignmentRepo {
    listByOrganization(
        organizationId: string,
    ): Promise<OrganizationObjectiveAssignment[]>;
    create(
        payload: OrganizationObjectiveAssignmentCreate,
    ): Promise<OrganizationObjectiveAssignment>;
    remove(id: string): Promise<void>;
}
