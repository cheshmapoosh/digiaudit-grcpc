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
}

export type ObjectiveReadonlyKeys =
    | "id"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "deletedAt"
    | "deletedBy";

export type ObjectiveNodeCreate = Omit<ObjectiveNode, ObjectiveReadonlyKeys>;

export type ObjectiveNodeUpdate = Partial<Omit<ObjectiveNode, ObjectiveReadonlyKeys>>;
