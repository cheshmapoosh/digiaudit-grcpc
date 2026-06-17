export interface OrganizationObjectiveAssignment {
    assignmentId: string;
    objectiveNodeId: string;
    organizationId: string;
    objectiveCode: string;
    objectiveTitle: string;
    objectiveStatus?: string;
    objectiveType?: string;
    description?: string;
    effectiveFrom?: string;
    validUntil?: string;
    active: boolean;
}

export interface OrganizationObjectiveAssignmentCreate {
    organizationId: string;
    objectiveNodeId: string;
}

export interface OrganizationObjectiveOption {
    objectiveNodeId: string;
    code: string;
    title: string;
    description?: string;
    status?: string;
    typeLabel?: string;
    validFrom?: string;
    validTo?: string;
}

export interface OrganizationObjectiveView extends OrganizationObjectiveOption {
    assignmentId: string;
    organizationId: string;
    active: boolean;
}
