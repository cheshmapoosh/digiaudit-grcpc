import type { AuditFields } from "@/shared/domain/audit.model";
import type { DocumentAggregateRequest, DocumentCommandResponse } from "@/features/document";
import type { LocalContextChange, LocalContextRow } from "@/features/local-master-data";

export type OrganizationStatus = "ACTIVE" | "INACTIVE" | "DELETED";
export type OrganizationEditableStatus = "ACTIVE" | "INACTIVE";

export const ORGANIZATION_TYPES = [
    "HOLDING",
    "COMPANY",
    "DEPUTY",
    "OFFICE",
    "MANAGEMENT",
    "DEPARTMENT",
    "BRANCH",
    "UNIT",
    "COMMITTEE",
    "GROUP",
    "OTHER",
] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export interface OrganizationOwnerOption { id: string; displayLabel: string; username: string; roleCode: string }
export interface OrganizationOwnerAssignment {
    assignmentId: string; profileId: string; organizationId: string; userId: string;
    displayLabel: string; username: string; roleCode: string | null; eligible: boolean; version: number;
}
export interface OrganizationOwnerChange {
    operation: "CREATE_OR_RESTORE" | "DELETE"; userId: string; assignmentId?: string; version?: number;
}

export interface MasterDataRevisionMutationResponse {
    entityId: string;
    revisionId: string;
    version: number;
}

export interface MasterDataAggregateMutationResponse extends MasterDataRevisionMutationResponse {
    finalizedDocuments: DocumentCommandResponse[];
    organization: OrganizationNode;
    subprocesses?: { revisionId: string; rows: LocalContextRow[] } | null;
}

export interface OrganizationNode extends AuditFields {
    id: string;
    code: string;
    name: string;
    organizationType: OrganizationType;
    organizationTypeId?: string;
    organizationTypeName?: string | null;
    ownerAssignments?: OrganizationOwnerAssignment[];
    parentOrganizationId: string | null;
    displayLabel: string;
    status: OrganizationStatus;
    location?: string | null;
    description?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
    version: number;
}

export type OrganizationReadonlyKeys =
    | "id"
    | "displayLabel"
    | "version"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "deletedAt"
    | "deletedBy";

export interface OrganizationNodeCreate {
    code: string;
    name: string;
    organizationType: OrganizationType;
    organizationTypeId: string;
    ownerAssignments?: OrganizationOwnerChange[];
    subprocesses?: LocalContextChange[];
    parentOrganizationId?: string | null;
    location?: string | null;
    description?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
    documents: DocumentAggregateRequest;
}

export interface OrganizationNodeUpdate {
    version: number;
    name: string;
    organizationType: OrganizationType;
    organizationTypeId: string;
    status: OrganizationEditableStatus;
    ownerAssignments?: OrganizationOwnerChange[];
    subprocesses?: LocalContextChange[];
    parentOrganizationId?: string | null;
    location?: string | null;
    description?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
    documents: DocumentAggregateRequest;
}

export interface OrganizationLifecycleCommand {
    version: number;
}
