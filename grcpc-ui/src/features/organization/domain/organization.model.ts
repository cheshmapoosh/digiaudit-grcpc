import type { AuditFields } from "@/shared/domain/audit.model";

export type OrganizationStatus = "active" | "inactive";

export type OrganizationType =
    | "holding"
    | "company"
    | "deputy"
    | "office"
    | "unit"
    | "committee"
    | "group"
    | "department"
    | "management"
    | "branch"
    | "other";

export interface OrganizationNode extends AuditFields {
    id: string;
    code: string;
    name: string;
    type: OrganizationType;
    parentId: string | null;
    status: OrganizationStatus;
    validFrom?: string;
    validTo?: string;
    location?: string;
    description?: string;
}

export type OrganizationReadonlyKeys =
    | "id"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "deletedAt"
    | "deletedBy";

export type OrganizationNodeCreate = Omit<
    OrganizationNode,
    OrganizationReadonlyKeys
>;

export type OrganizationNodeUpdate = Partial<
    Omit<OrganizationNode, OrganizationReadonlyKeys>
>;
