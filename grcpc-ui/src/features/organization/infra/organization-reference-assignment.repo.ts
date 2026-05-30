import type {
    OrganizationReferenceAssignment,
    OrganizationReferenceAssignmentCreate,
    OrganizationReferenceType,
} from "../domain/organization-process-assignment.model";

export interface OrganizationReferenceAssignmentRepo {
    listByOrganization(
        organizationId: string,
        referenceType: OrganizationReferenceType,
    ): Promise<OrganizationReferenceAssignment[]>;
    create(
        payload: OrganizationReferenceAssignmentCreate,
    ): Promise<OrganizationReferenceAssignment>;
    remove(id: string): Promise<void>;
}
