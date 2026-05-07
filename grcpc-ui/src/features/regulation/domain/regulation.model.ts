import type { AuditFields } from "@/shared/domain/audit.model";

export type RegulationStatus = "active" | "inactive";

export type RegulationNodeType = "lawGroup" | "law" | "lawRequirement";

export interface RegulationNode extends AuditFields {
    id: string;
    code: string;
    title: string;
    nodeType: RegulationNodeType;
    parentId: string | null;
    status: RegulationStatus;
    sortOrder?: number;
    description?: string;

    effectiveDate?: string;
    validTo?: string;
    issuer?: string;
    ownerName?: string;
    documentsCount?: number;
}

export type RegulationReadonlyKeys =
    | "id"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "deletedAt"
    | "deletedBy";

export type RegulationNodeCreate = Omit<RegulationNode, RegulationReadonlyKeys>;

export type RegulationNodeUpdate = Partial<Omit<RegulationNode, RegulationReadonlyKeys>>;
