import type { AuditFields } from "@/shared/domain/audit.model";

export type ObjectiveStatus = "active" | "inactive";

export type ObjectiveNodeType = "objective";

export type ObjectiveType =
    | "operational"
    | "compliance"
    | "strategic"
    | "financial"
    | "reporting"
    | "market";

export interface ObjectiveOrganizationRef {
    organizationId: string;
    organizationCode?: string;
    organizationName?: string;
    organizationStatus?: "active" | "inactive";
    relationType?: string;
    primaryResponsible?: boolean;
}

export interface ObjectiveNode extends AuditFields {
    id: string;
    code: string;
    title: string;
    nodeType: ObjectiveNodeType;
    parentId: string | null;
    status: ObjectiveStatus;
    sortOrder?: number;
    description?: string;

    strategy?: string;
    objectiveType?: ObjectiveType;
    objectiveClass?: string;
    organizationUnitId?: string | null;
    organizationUnitName?: string;
    effectiveFrom?: string;
    validUntil?: string;
    documentsCount?: number;
    organizations?: ObjectiveOrganizationRef[];
}

export type ObjectiveReadonlyKeys =
    | "id"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "deletedAt"
    | "deletedBy";

export type ObjectiveNodeCreate = Omit<
    ObjectiveNode,
    ObjectiveReadonlyKeys | "organizations"
> & {
    organizationIds?: string[];
};

export type ObjectiveNodeUpdate = Partial<
    Omit<ObjectiveNode, ObjectiveReadonlyKeys | "organizations">
> & {
    organizationIds?: string[];
};
