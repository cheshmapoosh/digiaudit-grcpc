import type { AuditFields } from "@/shared/domain/audit.model";
import type { DocumentAggregateRequest, DocumentCommandResponse } from "@/features/document";

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

export interface OrganizationOwnerOption { id: string; displayLabel: string }

export interface MasterDataRevisionMutationResponse {
    entityId: string;
    revisionId: string;
    version: number;
}

export interface MasterDataAggregateMutationResponse extends MasterDataRevisionMutationResponse {
    finalizedDocuments: DocumentCommandResponse[];
    organization: OrganizationNode;
}

export interface OrganizationNode extends AuditFields {
    id: string;
    code: string;
    name: string;
    organizationType: OrganizationType;
    ownerUserId?: string | null;
    ownerDisplayLabel?: string | null;
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
    ownerUserId?: string | null;
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
    status: OrganizationEditableStatus;
    ownerUserId?: string | null;
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
