import type { DocumentAggregateRequest, DocumentLinkTargetType } from "@/features/document";

export type CatalogFamily = "control" | "risk" | "accountGroup" | "regulation" | "policy";
export type CatalogKind = "controls" | "controlObjectives" | "riskCategories" | "riskTemplates" | "accountGroups" | "regulationGroups" | "regulations" | "regulationRequirements" | "policyGroups" | "policies";
export type LifecycleStatus = "ACTIVE" | "INACTIVE" | "DELETED";

export interface CatalogItem {
    id: string; code: string; title: string; description?: string | null; status: LifecycleStatus;
    validFrom?: string | null; validTo?: string | null; version: number; sortOrder?: number;
    parentCategoryId?: string | null; riskCategoryId?: string | null; parentAccountGroupId?: string | null;
    parentGroupId?: string | null; regulationGroupId?: string | null; regulationId?: string | null;
    policyGroupId?: string | null; parentId?: string | null;
}

export interface CatalogMutationResponse { entityId: string; revisionId: string; version: number; documents: unknown[]; }
export interface RevisionMutationResponse { entityId: string; revisionId: string; version: number; }
export interface CatalogForm { code: string; title: string; description: string; validFrom: string; validTo: string; sortOrder: string; parentId: string; }

export interface CatalogConfig {
    kind: CatalogKind; family: CatalogFamily; titleKey: string; title: string; baseUrl: string;
    documentTarget: DocumentLinkTargetType; parentField?: string; parentKind?: CatalogKind;
    hasSortOrder: boolean; supportsMove: boolean;
}

export interface CreateCatalogBody { code: string; title: string; description: string | null; validFrom: string | null; validTo: string | null; sortOrder?: number; documents: DocumentAggregateRequest; [key: string]: unknown; }
export interface UpdateCatalogBody { title: string; description: string | null; validFrom: string | null; validTo: string | null; version: number; documents: DocumentAggregateRequest; }
