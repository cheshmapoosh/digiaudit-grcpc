import type { AuditFields } from "@/shared/domain/audit.model";

export type OrganizationStatus = "ACTIVE" | "INACTIVE" | "DELETED";

export interface MasterDataRevisionMutationResponse {
    entityId: string;
    revisionId: string;
    version: number;
}

export interface OrganizationNode extends AuditFields {
    id: string;
    code: string;
    parentOrganizationId: string | null;
    displayLabel: string;
    status: OrganizationStatus;
    validFrom?: string | null;
    validTo?: string | null;
    version: number;
}

export type OrganizationReadonlyKeys =
    | "id"
    | "displayLabel"
    | "status"
    | "version"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "deletedAt"
    | "deletedBy";

export interface OrganizationNodeCreate {
    code: string;
    parentOrganizationId?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
}

export interface OrganizationNodeUpdate {
    version: number;
    validFrom?: string | null;
    validTo?: string | null;
}

export interface OrganizationMoveCommand {
    parentOrganizationId?: string | null;
    version: number;
}

export interface OrganizationLifecycleCommand {
    version: number;
}
